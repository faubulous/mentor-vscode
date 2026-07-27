import * as vscode from 'vscode';
import { DEFAULT_GRAPH_RELOAD_INTERVAL_SECONDS, SparqlConnection } from './sparql-connection';
import { ISparqlConnectionRegistry } from './sparql-connection-registry.interface';
import { ISparqlQueryService } from './sparql-query-service.interface';
import { IGraphManagementService } from './graph-management-service.interface';
import { ITripleStoreConfigService } from './triple-store-config-service.interface';
import { Store } from '@faubulous/mentor-rdf';
import { WORKSPACE_CONNECTION } from './workspace-store';
import { InferenceUri } from '@src/providers/inference-uri';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { Debouncer } from '@src/utilities/debounce';
import { isHttpEndpoint, isSafeAutoLoadEndpoint } from '@src/utilities/endpoint-url';
import { getErrorMessage } from '@src/utilities/error';

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
 * The shape of the graph cache persisted to `workspaceState`, keyed by connection ID.
 * Only successful loads are persisted; error entries are dropped so a window reload
 * retries a previously failing endpoint.
 */
type PersistedGraphCache = Record<string, {
    /**
     * The named-graph IRIs fetched from the SPARQL endpoint.
     */
    graphs: string[];

    /**
     * The timestamp (in milliseconds since the epoch) when the graphs were loaded.
     */
    loadedAt: number;

    /**
     * The endpoint URL the graphs were fetched from. Guards against hydrating a cache
     * for a connection whose endpoint was edited while the extension was not running.
     */
    endpointUrl: string;
}>;

/**
 * Manages named-graph lists fetched from remote SPARQL endpoints.
 *
 * For each connection with `autoLoadGraphs = true`, this service:
 * - executes the `listGraphs` query on startup and caches the result,
 * - serves subsequent load requests from the cache until the entry is older than
 *   `graphReloadIntervalSeconds` (a TTL; `0` or unset means the cache never expires
 *   and is only refreshed by an explicit, forced reload), and
 * - fires `onDidChangeGraphs` whenever the cached list changes.
 */
export class GraphManagementService implements IGraphManagementService {

    /**
     * The `workspaceState` key under which the graph cache is persisted.
     */
    private static readonly _storageKey = 'mentor.sparql.graphCache';

    /**
     * A map from connection IDs to their cached graph lists and load timestamps.
     */
    private readonly _graphCache = new Map<string, GraphCacheEntry>();

    /**
     * A map from connection IDs to their in-flight load promises, so concurrent
     * load requests for the same connection share a single endpoint query.
     */
    private readonly _pendingLoads = new Map<string, Promise<void>>();

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

    /**
     * The workspace store's graph IRIs at the last {@link notifyWorkspaceGraphsChanged}
     * evaluation, used to fire `onDidChangeGraphs` only when the set actually changed.
     */
    private _workspaceGraphsSnapshot = new Set<string>();

    /**
     * Debounces workspace change notifications: notifications arrive once per file
     * during indexing, and every evaluation scans the store's graph list.
     */
    private readonly _workspaceGraphsDebouncer = new Debouncer(300);

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _connectionRegistry: ISparqlConnectionRegistry,
        private readonly _queryService: ISparqlQueryService,
        private readonly _storeConfigService: ITripleStoreConfigService,
        private readonly _workspaceStore: Store
    ) {
        this._hydrateCache();
    }

    notifyWorkspaceGraphsChanged(): void {
        this._workspaceGraphsDebouncer.schedule(() => {
            const graphs = this._workspaceStore.getGraphs();

            const unchanged = graphs.length === this._workspaceGraphsSnapshot.size
                && graphs.every(g => this._workspaceGraphsSnapshot.has(g));

            if (unchanged) {
                return;
            }

            this._workspaceGraphsSnapshot = new Set(graphs);

            // The workspace connection never goes through _executeGraphLoad, so this
            // is the only place its onDidChangeGraphs event is emitted. Every consumer
            // of workspace graph counts (status bar, connections list, graph linting)
            // converges on this one signal.
            this._onDidChangeGraphs.fire(WORKSPACE_CONNECTION.id);
        });
    }

    /**
     * Restores the graph cache persisted by a previous session so window reloads within
     * a connection's reload interval serve from the cache instead of the endpoint.
     * Entries are skipped when they are malformed, their connection no longer exists,
     * the connection's endpoint URL changed, or the reload interval is explicitly `0`
     * (those keep their refresh-on-startup behavior, as their cache never expires; an
     * unset interval uses the 24-hour default and is hydrated).
     * Fires no events: consumers are constructed after this service and pull on demand.
     */
    private _hydrateCache(): void {
        const persisted = this._context.workspaceState.get<PersistedGraphCache>(GraphManagementService._storageKey);

        if (!persisted || typeof persisted !== 'object') {
            return;
        }

        let skipped = false;

        for (const [connectionId, entry] of Object.entries(persisted)) {
            const isValid = entry
                && Array.isArray(entry.graphs)
                && entry.graphs.every(g => typeof g === 'string')
                && typeof entry.loadedAt === 'number'
                && typeof entry.endpointUrl === 'string';

            const connection = isValid ? this._connectionRegistry.getConnection(connectionId) : undefined;

            if (!isValid
                || !connection
                || this._getReloadIntervalSeconds(connection) <= 0
                || connection.endpointUrl !== entry.endpointUrl) {
                skipped = true;
                continue;
            }

            // Expired entries are hydrated too: consumers get instant data while the
            // next load (which sees the entry as stale) refreshes it from the endpoint.
            this._graphCache.set(connectionId, { graphs: entry.graphs, loadedAt: entry.loadedAt });
        }

        // Write back the cleaned snapshot so entries for deleted or changed connections
        // do not linger in the workspace state.
        if (skipped) {
            this._persistCache();
        }
    }

    /**
     * Persists the successfully loaded cache entries to `workspaceState`. Entries with
     * errors or without a resolvable connection are dropped from the snapshot, so a
     * failed load removes a previously persisted list and a window reload retries it.
     */
    private _persistCache(): void {
        const snapshot: PersistedGraphCache = {};

        for (const [connectionId, entry] of this._graphCache) {
            const connection = this._connectionRegistry.getConnection(connectionId);

            if (entry.error === undefined && connection) {
                snapshot[connectionId] = {
                    graphs: entry.graphs,
                    loadedAt: entry.loadedAt,
                    endpointUrl: connection.endpointUrl,
                };
            }
        }

        void this._context.workspaceState.update(GraphManagementService._storageKey, snapshot);
    }

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

    async loadGraphsForConnection(connection: SparqlConnection, options?: { force?: boolean }): Promise<void> {
        // Serve from the cache while the entry is still fresh: the endpoint is only
        // contacted when the reload interval has been exceeded or a reload is forced.
        if (!options?.force && this._isCacheFresh(connection)) {
            return;
        }

        // Share an in-flight load instead of issuing a duplicate query. A forced reload
        // also joins the pending one — its result is equally fresh.
        const pending = this._pendingLoads.get(connection.id);

        if (pending) {
            return pending;
        }

        const load = this._executeGraphLoad(connection)
            .finally(() => this._pendingLoads.delete(connection.id));

        this._pendingLoads.set(connection.id, load);

        return load;
    }

    /**
     * Whether the cached entry for a connection is still within its reload interval.
     * An unset `graphReloadIntervalSeconds` falls back to the 24-hour default; an
     * explicit `0` means the cache never expires.
     */
    private _isCacheFresh(connection: SparqlConnection): boolean {
        const entry = this._graphCache.get(connection.id);

        if (!entry) {
            return false;
        }

        const dueTime = this._getReloadDueTime(entry.loadedAt, connection);

        return dueTime === undefined || Date.now() < dueTime;
    }

    /**
     * The effective reload interval for a connection: the configured value, or the
     * 24-hour default when unset — matching the default the connection editor displays.
     */
    private _getReloadIntervalSeconds(connection: SparqlConnection): number {
        return connection.graphReloadIntervalSeconds ?? DEFAULT_GRAPH_RELOAD_INTERVAL_SECONDS;
    }

    /**
     * The timestamp (in milliseconds since the epoch) at which a reload of the graph
     * list loaded at `loadedAt` becomes due, or `undefined` when the cache never
     * expires (explicit interval of `0`).
     *
     * Without a `graphReloadTime`, this is a plain sliding interval. With one, the
     * reload is anchored to the local time of day: it becomes due at the first
     * occurrence of that time after the load, plus the remaining full days when the
     * interval spans multiple days — e.g. "every 2 days after 02:00".
     */
    private _getReloadDueTime(loadedAt: number, connection: SparqlConnection): number | undefined {
        const intervalSeconds = this._getReloadIntervalSeconds(connection);

        if (intervalSeconds <= 0) {
            return undefined;
        }

        const reloadTime = this._parseReloadTime(connection.graphReloadTime);

        if (!reloadTime) {
            return loadedAt + intervalSeconds * 1000;
        }

        const due = new Date(loadedAt);
        due.setHours(reloadTime.hours, reloadTime.minutes, 0, 0);

        if (due.getTime() <= loadedAt) {
            due.setDate(due.getDate() + 1);
        }

        const intervalDays = Math.max(1, Math.floor(intervalSeconds / 86_400));
        due.setDate(due.getDate() + intervalDays - 1);

        return due.getTime();
    }

    /**
     * Parses a `HH:MM` (24-hour) reload time, returning `undefined` for missing or
     * malformed values so they fall back to the plain sliding interval.
     */
    private _parseReloadTime(time: string | undefined): { hours: number; minutes: number } | undefined {
        const match = time?.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

        return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : undefined;
    }

    private async _executeGraphLoad(connection: SparqlConnection): Promise<void> {
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
            const error = getErrorMessage(e);
            this._graphCache.set(connection.id, { graphs: [], loadedAt: Date.now(), error });
        } finally {
            this._persistCache();
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
            if (this._isEndpointSafeForAutoLoad(c)) {
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

        // Load sequentially: each load pays Comunica's query parsing/planning —
        // synchronous CPU on the shared extension host — so firing all
        // connections at once bursts that work into a single window (typically
        // during startup, delaying other extensions). The lists only feed the
        // connection pickers, so slower overall completion is harmless.
        for (const connection of safe) {
            await this.loadGraphsForConnection(connection);
        }
    }

    async ensureGraphsLoadedForConnection(connection: SparqlConnection, options?: { retryOnError?: boolean }): Promise<void> {
        // Mirror the auto-load eligibility and safety constraints: never contact
        // endpoints in an untrusted workspace, only `autoLoadGraphs` connections opt in,
        // and protected connections are excluded.
        if (!vscode.workspace.isTrusted) {
            return;
        }

        if (!connection.autoLoadGraphs || connection.isProtected) {
            return;
        }

        // Apply the same endpoint-safety gate as auto-load (SSRF protection for
        // workspace-scoped connections).
        if (!this._isEndpointSafeForAutoLoad(connection)) {
            return;
        }

        // A fresh cache entry that holds an error would silently serve the failure
        // for the rest of the reload interval — and no onDidChangeGraphs recovery
        // event would ever fire. Explicit user actions (e.g. switching a document's
        // connection) opt into retrying the failed load.
        const retryFailedLoad = options?.retryOnError === true
            && this._graphCache.get(connection.id)?.error !== undefined;

        // The load itself is cache-aware: it only contacts the endpoint when no entry
        // exists yet or the reload interval has been exceeded.
        await this.loadGraphsForConnection(connection, { force: retryFailedLoad });
    }

    /**
     * Whether a connection's endpoint may be contacted for auto-loading. User-scoped
     * connections only need to be HTTP(S); workspace-scoped connections (which may come
     * from shared/untrusted settings) additionally must not target internal hosts.
     */
    private _isEndpointSafeForAutoLoad(connection: SparqlConnection): boolean {
        return connection.configScope === ConfigurationScope.User
            ? isHttpEndpoint(connection.endpointUrl)
            : isSafeAutoLoadEndpoint(connection.endpointUrl);
    }

    dispose(): void {
        this._workspaceGraphsDebouncer.dispose();
        this._onDidChangeGraphs.dispose();
        this._onDidGraphLoadStart.dispose();
        this._onDidGraphLoadEnd.dispose();
    }
}
