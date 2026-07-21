import { SparqlQueryExecutionState } from "@src/languages/sparql/services/sparql-query-state";
import { SparqlConnection } from "@src/languages/sparql/services/sparql-connection";
import { ExecuteCommandMessage } from '../../webview-messaging';

/**
 * The graph-list state of a connection: the cached named-graph count and the
 * error of the last graph load, if any.
 */
export interface SparqlConnectionGraphStatus {
    count: number;
    error?: string;
}

export type SparqlResultsWebviewMessages =
    ExecuteCommandMessage |
    { readonly id: 'GetSparqlQueryHistory' } |
    { readonly id: 'PostSparqlQueryHistory', history: SparqlQueryExecutionState[], selectLatest?: boolean } |
    { readonly id: 'SparqlQueryExecutionStarted', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionEnded', queryState: SparqlQueryExecutionState } |
    { readonly id: 'CancelSparqlQueryExecution', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionCancelled', queryState: SparqlQueryExecutionState } |
    { readonly id: 'EditBackgroundQuery', queryId: string } |
    { readonly id: 'OpenRawResponse', queryId: string } |
    { readonly id: 'UpdateQueryDocumentIri', queryId: string, documentIri: string } |
    { readonly id: 'ShowSparqlWelcome' } |
    { readonly id: 'GetSparqlConnections' } |
    { readonly id: 'PostSparqlConnections', connections: SparqlConnection[], statuses: Record<string, SparqlConnectionGraphStatus> } |
    { readonly id: 'TestSparqlConnection', connection: SparqlConnection } |
    { readonly id: 'TestSparqlConnectionResult', connectionId: string, success: boolean, error?: string } |
    { readonly id: 'ListSparqlConnectionGraphs', connection: SparqlConnection } |
    { readonly id: 'SparqlConnectionGraphsChanged', connectionId: string, status: SparqlConnectionGraphStatus } |
    { readonly id: 'SparqlConnectionGraphsLoading', connectionId: string, loading: boolean };
