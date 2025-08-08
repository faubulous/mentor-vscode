import { SparqlQueryExecutionState } from "@/services/sparql-query-state";

export type SparqlResultsWebviewMessages =
    { readonly id: 'ExecuteCommand', command: string, args?: any[] } |
    { readonly id: 'GetSparqlQueryHistoryRequest' } |
    { readonly id: 'GetSparqlQueryHistoryResponse', history: SparqlQueryExecutionState[] } |
    { readonly id: 'RestoreState', state: any } |
    { readonly id: 'SaveStateRequest' } |
    { readonly id: 'SaveStateResponse', success: boolean } |
    { readonly id: 'SetSparqlQueryState', queryState: SparqlQueryExecutionState } |
    { readonly id: 'SparqlQueryHistoryChanged' };