import { SparqlEndpoint } from "@/services/sparql-endpoint";
import { Credential } from '@/services/credential-storage-service';

export type SparqlEndpointMessages =
    { id: 'ExecuteCommand', command: string, args?: any[] } |
    { id: 'EditSparqlEndpoint', endpoint: SparqlEndpoint } |
    { id: 'SaveSparqlEndpoint', endpoint: SparqlEndpoint, credential: Credential | null } |
    { id: 'UpdateSparqlEndpoint', endpoint: SparqlEndpoint } |
    { id: 'DeleteSparqlEndpoint', endpointId: string } |
    { id: 'GetSparqlEndpointCredential', endpointUrl: string } |
    { id: 'GetSparqlEndpointCredentialResult', credential: Credential | undefined } |
    { id: 'TestSparqlEndpoint', endpoint: SparqlEndpoint, credential: Credential | null } |
    { id: 'TestSparqlEndpointResult', error: { code: number, message: string} | null };