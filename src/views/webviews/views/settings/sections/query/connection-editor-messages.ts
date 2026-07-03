import { SparqlConnection, SparqlConnectionView } from "@src/languages/sparql/services/sparql-connection";
import { TripleStoreConfig } from "@src/languages/sparql/services/triple-store-config";
import { AuthCredential, MicrosoftAuthCredential } from '@src/services/core/credential';
import { ExecuteCommandMessage } from '../../../../webview-messaging';

export type ConnectionEditorMessages =
    ExecuteCommandMessage |
    { id: 'DeleteConnection', connection: SparqlConnection } |
    { id: 'DeleteSparqlConnection', connectionId: string } |
    { id: 'DiscardSparqlConnection', connectionId: string } |
    { id: 'EditSparqlConnection'; connection: SparqlConnectionView } |
    { id: 'FetchMicrosoftAuthCredential', connectionId: string, scopes: string[] } |
    { id: 'FetchMicrosoftAuthCredentialResult', connectionId: string, credential: MicrosoftAuthCredential | null } |
    { id: 'GetSparqlConnection' } |
    { id: 'GetStoreTypes' } |
    { id: 'GetStoreTypesResult', storeConfigs: TripleStoreConfig[] } |
    { id: 'GetSparqlConnectionCredential', connectionId: string } |
    { id: 'GetSparqlConnectionCredentialResult', connectionId: string, credential: AuthCredential | undefined } |
    { id: 'GetSparqlConnectionResult', connection: SparqlConnection } |
    { id: 'SaveSparqlConnection', connection: SparqlConnection, credential: AuthCredential | null } |
    { id: 'TestSparqlConnection', connection: SparqlConnection, credential: AuthCredential | null } |
    { id: 'TestSparqlConnectionResult', error: { code: number, message: string } | null } |
    { id: 'ToggleSparqlConnectionInference', connectionId: string } |
    { id: 'ToggleSparqlConnectionInferenceResult', connectionId: string, inferenceEnabled: boolean };
