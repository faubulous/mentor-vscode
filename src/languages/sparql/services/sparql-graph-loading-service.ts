import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlConnection } from './sparql-connection';
import { ISparqlConnectionService } from './sparql-connection-service.interface';
import { ISparqlQueryService } from './sparql-query-service.interface';
import { ISparqlGraphLoadingService } from './sparql-graph-loading-service.interface';

interface GraphCacheEntry {
    graphs: string[];
    loadedAt: number;
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
export class SparqlGraphLoadingService implements ISparqlGraphLoadingService {

    private readonly _graphCache = new Map<string, GraphCacheEntry>();

    private readonly _timers = new Map<string, ReturnType<typeof setInterval>>();

    private readonly _onDidChangeGraphs = new vscode.EventEmitter<string>();
    public readonly onDidChangeGraphs = this._onDidChangeGraphs.event;

    private readonly _onDidGraphLoadStart = new vscode.EventEmitter<SparqlConnection>();
    public readonly onDidGraphLoadStart = this._onDidGraphLoadStart.event;

    private readonly _onDidGraphLoadEnd = new vscode.EventEmitter<SparqlConnection>();
    public readonly onDidGraphLoadEnd = this._onDidGraphLoadEnd.event;

    private get _connectionService(): ISparqlConnectionService {
        return container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
    }

    private get _queryService(): ISparqlQueryService {
        return container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
    }

    getGraphsForConnection(connectionId: string): string[] {
        return this._graphCache.get(connectionId)?.graphs ?? [];
    }

    isGraphsLoaded(connectionId: string): boolean {
        const entry = this._graphCache.get(connectionId);
        return entry !== undefined && entry.error === undefined;
    }

    getGraphLoadError(connectionId: string): string | undefined {
        return this._graphCache.get(connectionId)?.error;
    }

    async loadGraphsForConnection(connection: SparqlConnection): Promise<void> {
        this._onDidGraphLoadStart.fire(connection);

        try {
            const query = this._connectionService.getQueryTemplate(connection, 'listGraphs');

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

    async loadAllAutoLoadConnections(): Promise<void> {
        const connections = this._connectionService
            .getConnections()
            .filter(c => c.autoLoadGraphs && !c.isProtected);

        if (connections.length === 0) {
            return;
        }

        await Promise.all(connections.map(c => this.loadGraphsForConnection(c)));

        for (const connection of connections) {
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
