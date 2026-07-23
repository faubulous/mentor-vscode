import * as vscode from 'vscode';
import { SparqlConnection } from './sparql-connection';

/**
 * Interface for the GraphManagementService.
 */
export interface IGraphManagementService extends vscode.Disposable {
    /**
     * Fired with the connection ID whenever the graph list for a connection is updated.
     */
    readonly onDidChangeGraphs: vscode.Event<string>;

    /**
     * Fired immediately before graph loading starts for a connection.
     */
    readonly onDidGraphLoadStart: vscode.Event<SparqlConnection>;

    /**
     * Fired when graph loading completes (success or failure) for a connection.
     */
    readonly onDidGraphLoadEnd: vscode.Event<SparqlConnection>;

    /**
     * Returns the graph IRIs for the workspace store, or an empty array if no data has been loaded yet.
     * @param inferenceEnabled Whether to include inference graphs.
     * @returns The graph IRIs for the workspace store.
     */
    getWorkspaceGraphs(inferenceEnabled: boolean): string[];

    /**
     * Returns the cached graph IRIs for the given connection, or an empty array if
     * no data has been loaded yet.
     * @param connectionId The connection ID.
     * @param inferenceEnabled Whether to include inference graphs.
     */
    getGraphsForConnection(connectionId: string, inferenceEnabled: boolean): string[];

    /**
     * Returns `true` if graphs have been successfully loaded at least once for the
     * given connection.
     * @param connectionId The connection ID.
     */
    hasGraphsForConnection(connectionId: string): boolean;

    /**
     * Returns the error message from the last failed graph load for the given
     * connection, or `undefined` if no error occurred or no load has been attempted.
     * @param connectionId The connection ID.
     */
    getGraphLoadError(connectionId: string): string | undefined;

    /**
     * Loads the graph list for a connection, serving from the cache while the last
     * result is younger than the connection's `graphReloadIntervalSeconds` (unset falls
     * back to the 24-hour default; an explicit `0` means the cache never expires).
     * When the cache is stale, missing
     * or the reload is forced, executes the `listGraphs` query and stores the result,
     * firing `onDidGraphLoadStart` before and `onDidGraphLoadEnd` after. Concurrent
     * calls for the same connection share a single query.
     * @param connection The SPARQL connection to load graphs for.
     * @param options Set `force` to bypass the cache, e.g. for a user-initiated reload.
     */
    loadGraphsForConnection(connection: SparqlConnection, options?: { force?: boolean }): Promise<void>;

    /**
     * Loads graphs in parallel for all connections that have `autoLoadGraphs` enabled.
     * Later on-demand loads refresh a connection's list once its
     * `graphReloadIntervalSeconds` has been exceeded.
     */
    autoLoadConnections(): Promise<void>;

    /**
     * Loads a connection's graphs on demand — used when a document is switched to a
     * connection whose graphs were not auto-loaded at startup, so consumers (e.g. the
     * graph linter) reflect the newly selected source. Applies the same trust,
     * `autoLoadGraphs`, protected and endpoint-safety constraints as
     * {@link autoLoadConnections}. Serves from the cache while it is fresh; the endpoint
     * is only contacted when no load has been attempted yet or the connection's reload
     * interval has been exceeded.
     * @param connection The SPARQL connection to ensure graphs are loaded for.
     */
    ensureGraphsLoadedForConnection(connection: SparqlConnection): Promise<void>;
}
