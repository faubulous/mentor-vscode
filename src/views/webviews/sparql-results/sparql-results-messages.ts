import { SparqlQueryExecutionState } from "@src/services/sparql-query-state";

export type SparqlResultsWebviewMessages =
    { readonly id: 'ExecuteCommand', command: string, args?: any[] } |
    { readonly id: 'GetSparqlQueryHistory' } |
    { readonly id: 'PostSparqlQueryHistory', history: SparqlQueryExecutionState[] } |
    { readonly id: 'SparqlQueryExecutionStarted', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionEnded', queryState: SparqlQueryExecutionState } |
    { readonly id: 'CancelSparqlQueryExecution', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionCancelled', queryState: SparqlQueryExecutionState };