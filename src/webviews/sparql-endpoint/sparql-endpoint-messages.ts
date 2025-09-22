import { SparqlConnection } from "@/services/sparql-connection";

export type SparqlEndpointMessages =
    { readonly id: 'ExecuteCommand', command: string, args?: any[] } |
    { readonly id: 'EditSparqlEndpoint', endpoint: SparqlConnection };