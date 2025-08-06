import { SparqlQueryState } from "@/services/sparql-query-state";

export type SparqlResultsWebviewMessages =
    { readonly id: 'ExecuteCommand', command: string, args?: any[] } |
    { readonly id: 'SetSparqlQueryState', queryState: SparqlQueryState } |
    { readonly id: 'GetSparqlQueryHistoryRequest' } |
    { readonly id: 'GetSparqlQueryHistoryResponse', history: SparqlQueryState[] };