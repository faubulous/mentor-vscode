import { SparqlConnection } from "@src/services/sparql-connection";
import { AuthCredential, MicrosoftAuthCredential } from '@src/services/credential';

export type SparqlConnectionMessages =
    { id: 'ExecuteCommand', command: string, args?: any[] } |
    { id: 'SaveSparqlConnection', connection: SparqlConnection, credential: AuthCredential | null } |
    { id: 'UpdateSparqlConnection', connection: SparqlConnection } |
    { id: 'DeleteSparqlConnection', connectionId: string } |
    { id: 'GetSparqlConnection' } |
    { id: 'GetSparqlConnectionResult', connection: SparqlConnection } |
    { id: 'GetSparqlConnectionCredential', connectionId: string } |
    { id: 'GetSparqlConnectionCredentialResult', connectionId: string, credential: AuthCredential | undefined } |
    { id: 'FetchMicrosoftAuthCredential', connectionId: string, scopes: string[] } |
    { id: 'FetchMicrosoftAuthCredentialResult', connectionId: string, credential: MicrosoftAuthCredential | null } |
    { id: 'TestSparqlConnection', connection: SparqlConnection, credential: AuthCredential | null } |
    { id: 'TestSparqlConnectionResult', error: { code: number, message: string } | null };