import { SparqlQueryExecutionState } from "@src/languages/sparql/services/sparql-query-state";
import { ExecuteCommandMessage } from '../webview-messaging';

export type SparqlResultsWebviewMessages =
    ExecuteCommandMessage |
    { readonly id: 'GetSparqlQueryHistory' } |
    { readonly id: 'PostSparqlQueryHistory', history: SparqlQueryExecutionState[] } |
    { readonly id: 'SparqlQueryExecutionStarted', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionEnded', queryState: SparqlQueryExecutionState } |
    { readonly id: 'CancelSparqlQueryExecution', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionCancelled', queryState: SparqlQueryExecutionState } |
    { readonly id: 'EditBackgroundQuery', queryId: string } |
    { readonly id: 'UpdateQueryDocumentIri', queryId: string, documentIri: string };