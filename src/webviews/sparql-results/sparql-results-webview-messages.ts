import { SparqlQueryExecutionState } from "@/services/sparql-query-state";

export type SparqlResultsWebviewMessages =
    { readonly id: 'ExecuteCommand', command: string, args?: any[] } |
    { readonly id: 'GetSparqlQueryHistoryRequest' } |
    { readonly id: 'GetSparqlQueryHistoryResponse', history: SparqlQueryExecutionState[] } |
    { readonly id: 'SparqlQueryExecutionStarted', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryExecutionEnded', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryHistoryChanged' };