import { SparqlConnection } from "@/services/sparql-connection";
import { Credential } from '@/services/credential-storage-service';

export type SparqlEndpointMessages =
    { id: 'ExecuteCommand', command: string, args?: any[] } |
    { id: 'EditSparqlEndpoint', endpoint: SparqlConnection } |
    { id: 'SaveSparqlEndpoint', endpoint: SparqlConnection, credential?: Credential } |
    { id: 'GetSparqlEndpointCredential', endpointUrl: string } |
    { id: 'GetSparqlEndpointCredentialResult', credential: Credential | undefined } |
    { id: 'TestSparqlEndpoint', endpoint: SparqlConnection, credential?: Credential | null } |
    { id: 'TestSparqlEndpointResult', isReachable: boolean };