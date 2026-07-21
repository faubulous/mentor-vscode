import * as vscode from 'vscode';
import { SparqlConnection } from './sparql-connection';

/**
 * Interface for the SparqlGraphService.
 */
export interface ISparqlGraphService extends vscode.Disposable {
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
     * Returns the cached graph IRIs for the given connection, or an empty array if
     * no data has been loaded yet.
     * @param connectionId The connection ID.
     */
    getGraphsForConnection(connectionId: string): string[];

    /**
     * Returns `true` if graphs have been successfully loaded at least once for the
     * given connection.
     * @param connectionId The connection ID.
     */
    isGraphsLoaded(connectionId: string): boolean;

    /**
     * Returns the error message from the last failed graph load for the given
     * connection, or `undefined` if no error occurred or no load has been attempted.
     * @param connectionId The connection ID.
     */
    getGraphLoadError(connectionId: string): string | undefined;

    /**
     * Executes the `listGraphs` query for a connection and stores the result in the
     * cache. Fires `onDidGraphLoadStart` before and `onDidGraphLoadEnd` after.
     * @param connection The SPARQL connection to load graphs for.
     */
    loadGraphsForConnection(connection: SparqlConnection): Promise<void>;

    /**
     * Loads graphs in parallel for all connections that have `autoLoadGraphs` enabled,
     * then schedules periodic reloads according to each connection's
     * `graphReloadIntervalSeconds` setting.
     */
    loadAllAutoLoadConnections(): Promise<void>;
}
