import { SparqlConnectionView } from "@src/languages/sparql/services/sparql-connection";
import { TripleStoreConfig } from "@src/languages/sparql/services/triple-store-config";
import { AuthCredential, MicrosoftAuthCredential } from '@src/services/core/credential';
import { ExecuteCommandMessage } from '../../../../webview-messaging';

/**
 * Messages exchanged between the SPARQL connection editor modal and the host.
 *
 * The editor operates on {@link SparqlConnectionView} (the domain connection plus its
 * resolved inference default) in both directions; the host converts to the domain
 * type where needed. Note that persisting a view is safe: the connection service
 * serializes connections through an explicit field allowlist.
 */
export type ConnectionEditorMessages =
    ExecuteCommandMessage |
    { id: 'DiscardSparqlConnection', connectionId: string } |
    { id: 'EditSparqlConnection'; connection: SparqlConnectionView } |
    { id: 'FetchMicrosoftAuthCredential', connectionId: string, scopes: string[] } |
    { id: 'FetchMicrosoftAuthCredentialResult', connectionId: string, credential: MicrosoftAuthCredential | null } |
    { id: 'GetStoreTypes' } |
    { id: 'GetStoreTypesResult', storeConfigs: TripleStoreConfig[] } |
    { id: 'GetSparqlConnectionCredential', connectionId: string } |
    { id: 'GetSparqlConnectionCredentialResult', connectionId: string, credential: AuthCredential | undefined } |
    { id: 'SaveSparqlConnection', connection: SparqlConnectionView, credential: AuthCredential | null } |
    { id: 'TestSparqlConnection', connection: SparqlConnectionView, credential: AuthCredential | null } |
    { id: 'TestSparqlConnectionResult', error: { code: number, message: string } | null } |
    { id: 'ToggleSparqlConnectionInference', connectionId: string } |
    { id: 'ToggleSparqlConnectionInferenceResult', connectionId: string, inferenceEnabled: boolean };
