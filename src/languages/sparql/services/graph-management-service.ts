import * as vscode from 'vscode';
import { SparqlConnection } from './sparql-connection';
import { ISparqlConnectionRegistry } from './sparql-connection-registry.interface';
import { ISparqlQueryService } from './sparql-query-service.interface';
import { IGraphManagementService } from './graph-management-service.interface';
import { ITripleStoreConfigService } from './triple-store-config-service.interface';
import { Store } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/providers/inference-uri';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { isHttpEndpoint, isSafeAutoLoadEndpoint } from '@src/utilities/endpoint-url';

/**
 * An entry in the graph cache.
 */
interface GraphCacheEntry {
    /**
     * The list of named graphs fetched from the SPARQL endpoint.
     */
    graphs: string[];

    /**
     * The timestamp (in milliseconds since the epoch) when the graphs were last loaded.
     */
    loadedAt: number;

    /**
     * An error message if the graph loading failed, or `undefined` if the graphs were loaded successfully.
     */
    error?: string;
}

/**
 * Manages named-graph lists fetched from remote SPARQL endpoints.
 *
 * For each connection with `autoLoadGraphs = true`, this service:
 * - executes the `listGraphs` query on startup and caches the result,
 * - schedules periodic reloads according to `graphReloadIntervalSeconds`, and
 * - fires `onDidChangeGraphs` whenever the cached list changes.
 */
export class GraphManagementService implements IGraphManagementService {

    /**
     * A map from connection IDs to their cached graph lists and load timestamps.
     */
    private readonly _graphCache = new Map<string, GraphCacheEntry>();

    /**
     * A map from connection IDs to their scheduled reload timers (if any).
     */
    private readonly _timers = new Map<string, ReturnType<typeof setInterval>>();

    /**
     * An event emitter that fires when the list of graphs for a connection changes.
     */
    private readonly _onDidChangeGraphs = new vscode.EventEmitter<string>();

    /**
     * Fires when the list of graphs for a connection changes. The event argument is the connection ID.
     */
    public readonly onDidChangeGraphs = this._onDidChangeGraphs.event;

    /**
     * An event emitter that fires when the graph loading process starts for a connection.
     */
    private readonly _onDidGraphLoadStart = new vscode.EventEmitter<SparqlConnection>();

    /**
     * Fires when the graph loading process starts for a connection. The event argument is the connection object.
     */
    public readonly onDidGraphLoadStart = this._onDidGraphLoadStart.event;

    /**
     * An event emitter that fires when the graph loading process ends for a connection.
     */
    private readonly _onDidGraphLoadEnd = new vscode.EventEmitter<SparqlConnection>();

    /**
     * Fires when the graph loading process ends for a connection. The event argument is the connection object.
     */
    public readonly onDidGraphLoadEnd = this._onDidGraphLoadEnd.event;

    constructor(
        private readonly _connectionRegistry: ISparqlConnectionRegistry,
        private readonly _queryService: ISparqlQueryService,
        private readonly _storeConfigService: ITripleStoreConfigService,
        private readonly _workspaceStore: Store
    ) { }

    getGraphsForConnection(connectionId: string, inferenceEnabled: boolean): string[] {
        if (this._storeConfigService.isWorkspaceConnectionId(connectionId)) {
            const graphs = this._workspaceStore.getGraphs();

            return inferenceEnabled ? graphs : graphs.filter(g => !InferenceUri.isInferenceUri(g));
        } else {
            return this._graphCache.get(connectionId)?.graphs ?? [];
        }
    }

    getWorkspaceGraphs(inferenceEnabled: boolean): string[] {
        return this._workspaceStore.getGraphs()
            .filter(g => inferenceEnabled || !InferenceUri.isInferenceUri(g));
    }

    getGraphLoadError(connectionId: string): string | undefined {
        return this._graphCache.get(connectionId)?.error;
    }

    hasGraphsForConnection(connectionId: string): boolean {
        if (this._storeConfigService.isWorkspaceConnectionId(connectionId)) {
            return true;
        } else {
            const entry = this._graphCache.get(connectionId);

            return entry !== undefined && entry.error === undefined;
        }
    }

    async loadGraphsForConnection(connection: SparqlConnection): Promise<void> {
        this._onDidGraphLoadStart.fire(connection);

        try {
            const query = this._storeConfigService.getQueryTemplate(connection, 'listGraphs');

            if (!query) {
                this._graphCache.set(connection.id, { graphs: [], loadedAt: Date.now(), error: 'No listGraphs query configured for this store type' });
                return;
            }

            const result = await this._queryService.executeQueryOnConnection(query, connection);

            if (!result || result.type !== 'bindings') {
                this._graphCache.set(connection.id, { graphs: [], loadedAt: Date.now(), error: 'Unexpected query result' });
                return;
            }

            const graphs: string[] = [];

            for (const binding of result.bindings) {
                const term = [...binding][0]?.[1];

                if (term?.value) {
                    graphs.push(term.value);
                }
            }

            this._graphCache.set(connection.id, { graphs, loadedAt: Date.now() });
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            this._graphCache.set(connection.id, { graphs: [], loadedAt: Date.now(), error });
        } finally {
            this._onDidGraphLoadEnd.fire(connection);
            this._onDidChangeGraphs.fire(connection.id);
        }
    }

    async autoLoadConnections(): Promise<void> {
        // Auto-loading issues outbound network requests to endpoints that may be defined by
        // workspace settings. Never do this for untrusted workspaces.
        if (!vscode.workspace.isTrusted) {
            return;
        }

        const connections = this._connectionRegistry
            .getConnections()
            .filter(c => c.autoLoadGraphs && !c.isProtected);

        // Only auto-contact endpoints that are safe for their configuration scope. User-scoped
        // connections are configured by the user and may target loopback/private hosts (e.g. a
        // local Fuseki), so they only need to be HTTP(S). Workspace-scoped connections may come
        // from shared/untrusted settings, so they are additionally required not to target
        // internal hosts (SSRF / cloud-metadata protection).
        const safe: SparqlConnection[] = [];
        let skipped = 0;

        for (const c of connections) {
            const isSafe = c.configScope === ConfigurationScope.User
                ? isHttpEndpoint(c.endpointUrl)
                : isSafeAutoLoadEndpoint(c.endpointUrl);

            if (isSafe) {
                safe.push(c);
            } else {
                skipped++;
            }
        }

        if (skipped > 0) {
            vscode.window.showWarningMessage(
                `Mentor did not auto-load ${skipped} SPARQL connection(s) whose endpoint is not a public HTTP(S) URL. Open a connection manually to load its graphs.`
            );
        }

        if (safe.length === 0) {
            return;
        }

        await Promise.all(safe.map(c => this.loadGraphsForConnection(c)));

        for (const connection of safe) {
            this._scheduleReload(connection);
        }
    }

    private _scheduleReload(connection: SparqlConnection): void {
        const intervalMs = (connection.graphReloadIntervalSeconds ?? 0) * 1000;

        if (intervalMs <= 0) {
            return;
        }

        this._clearTimer(connection.id);

        const timer = setInterval(() => {
            this.loadGraphsForConnection(connection);
        }, intervalMs);

        this._timers.set(connection.id, timer);
    }

    private _clearTimer(connectionId: string): void {
        const existing = this._timers.get(connectionId);

        if (existing !== undefined) {
            clearInterval(existing);
            this._timers.delete(connectionId);
        }
    }

    dispose(): void {
        for (const id of this._timers.keys()) {
            this._clearTimer(id);
        }

        this._onDidChangeGraphs.dispose();
        this._onDidGraphLoadStart.dispose();
        this._onDidGraphLoadEnd.dispose();
    }
}
