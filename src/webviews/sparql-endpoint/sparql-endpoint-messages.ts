import { SparqlEndpoint } from "@/services/sparql-endpoint";
import { AuthCredential } from '@/services/credential';

export type SparqlEndpointMessages =
    { id: 'ExecuteCommand', command: string, args?: any[] } |
    { id: 'EditSparqlEndpoint', endpoint: SparqlEndpoint } |
    { id: 'SaveSparqlEndpoint', endpoint: SparqlEndpoint, credential: AuthCredential | null } |
    { id: 'UpdateSparqlEndpoint', endpoint: SparqlEndpoint } |
    { id: 'DeleteSparqlEndpoint', endpointId: string } |
    { id: 'GetSparqlEndpointCredential', connection: SparqlEndpoint } |
    { id: 'GetSparqlEndpointCredentialResult', connection: SparqlEndpoint, credential: AuthCredential | undefined } |
    { id: 'TestSparqlEndpoint', endpoint: SparqlEndpoint, credential: AuthCredential | null } |
    { id: 'TestSparqlEndpointResult', error: { code: number, message: string} | null };