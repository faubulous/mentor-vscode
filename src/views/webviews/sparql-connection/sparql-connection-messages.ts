import { SparqlConnection } from "@src/services/sparql/sparql-connection";
import { AuthCredential, MicrosoftAuthCredential } from '@src/services/core/credential';
import { ExecuteCommandMessage } from '../webview-messaging';

export type SparqlConnectionMessages =
    ExecuteCommandMessage |
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
    { id: 'TestSparqlConnectionResult', error: { code: number, message: string } | null } |
    { id: 'GetInferenceFeatureEnabled' } |
    { id: 'GetInferenceFeatureEnabledResult', value: boolean } |
    { id: 'ToggleSparqlConnectionInference', connectionId: string } |
    { id: 'ToggleSparqlConnectionInferenceResult', connectionId: string, inferenceEnabled: boolean };