import { SparqlConnection } from "@src/languages/sparql/services/sparql-connection";
import { SparqlStoreConfig } from "@src/languages/sparql/services/sparql-store-config";
import { AuthCredential, MicrosoftAuthCredential } from '@src/services/core/credential';
import { ConfigurationScope } from "@src/utilities/config-scope";
import { ExecuteCommandMessage } from '../../webview-messaging';

export type SparqlConnectionMessages =
    ExecuteCommandMessage |
    { id: 'ChangeSparqlConnectionScope'; connection: SparqlConnection; toScope: ConfigurationScope } |
    { id: 'DeleteConnection', connection: SparqlConnection } |
    { id: 'DeleteSparqlConnection', connectionId: string } |
    { id: 'DiscardSparqlConnection', connectionId: string } |
    { id: 'EditSparqlConnection'; connection: SparqlConnection } |
    { id: 'FetchMicrosoftAuthCredential', connectionId: string, scopes: string[] } |
    { id: 'FetchMicrosoftAuthCredentialResult', connectionId: string, credential: MicrosoftAuthCredential | null } |
    { id: 'GetSparqlConnection' } |
    { id: 'GetStoreTypes' } |
    { id: 'GetStoreTypesResult', storeConfigs: SparqlStoreConfig[] } |
    { id: 'GetSparqlConnectionCredential', connectionId: string } |
    { id: 'GetSparqlConnectionCredentialResult', connectionId: string, credential: AuthCredential | undefined } |
    { id: 'GetSparqlConnectionResult', connection: SparqlConnection } |
    { id: 'SaveSparqlConnection', connection: SparqlConnection, credential: AuthCredential | null } |
    { id: 'TestSparqlConnection', connection: SparqlConnection, credential: AuthCredential | null } |
    { id: 'TestSparqlConnectionResult', error: { code: number, message: string } | null } |
    { id: 'ToggleSparqlConnectionInference', connectionId: string } |
    { id: 'ToggleSparqlConnectionInferenceResult', connectionId: string, inferenceEnabled: boolean } |
    { id: 'UpdateSparqlConnection', connection: SparqlConnection };