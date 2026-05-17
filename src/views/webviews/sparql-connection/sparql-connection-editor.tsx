import { SparqlConnection } from "@src/languages/sparql/services/sparql-connection";
import { useCallback, useEffect, useState } from "react";
import { SparqlConnectionView } from "./sparql-connection-view";
import { AuthCredential, MicrosoftAuthCredential } from "@src/services/core/credential";
import { useScopedWebviewMessaging } from "../webview-hooks";
import { SparqlConnectionMessages } from "./sparql-connection-messages";

export interface SparqlConnectionEditorProps {
	connection: SparqlConnection;

	onBack: () => void;

	/**
	 * Optional notification fired after a successful save. Falls back to onBack.
	 */
	onSaved?: () => void;

	/**
	 * When true, renders an inline scope (User/Workspace) dropdown in the form.
	 */
	showScopeSelector?: boolean;

	/**
	 * When true, suppresses the internal header and uses a toolbar row for actions.
	 */
	hideHeader?: boolean;

	/**
	 * Notifies the host whenever the form's unsaved-changes state changes.
	 */
	onDirtyChange?: (dirty: boolean) => void;
}

export function SparqlConnectionEditor({ connection, onBack, onSaved, showScopeSelector, hideHeader, onDirtyChange }: SparqlConnectionEditorProps) {
	const [initialCredential, setInitialCredential] = useState<AuthCredential | null | undefined>(undefined);
	const [testResult, setTestResult] = useState<{ code: number; message: string } | null | undefined>(undefined);
	const [isTesting, setIsTesting] = useState(false);
	const [inferenceEnabled, setInferenceEnabled] = useState(false);
	const [fetchedMicrosoftCredential, setFetchedMicrosoftCredential] = useState<MicrosoftAuthCredential | null | undefined>(undefined);

	const reset = useCallback(() => {
		setInitialCredential(undefined);
		setTestResult(undefined);
		setIsTesting(false);
		setFetchedMicrosoftCredential(undefined);
	}, []);

	const handleMessage = useCallback((message: SparqlConnectionMessages) => {
		switch (message.id) {
			case 'GetSparqlConnectionCredentialResult': {
				if (!connection.id || message.connectionId === connection.id) {
					setInitialCredential(message.credential ?? null);
				}
				return;
			}
			case 'TestSparqlConnectionResult': {
				setIsTesting(false);
				setTestResult(message.error);
				return;
			}
			case 'GetInferenceFeatureEnabledResult': {
				setInferenceEnabled(message.value);
				return;
			}
			case 'FetchMicrosoftAuthCredentialResult': {
				if (!connection.id || message.connectionId === connection.id) {
					setFetchedMicrosoftCredential(message.credential ?? null);
				}
				return;
			}
		}
	}, [connection, reset]);

	const messaging = useScopedWebviewMessaging<SparqlConnectionMessages>('connections', handleMessage);

	useEffect(() => {
		reset();
	}, [connection.id]);

	return (
		<SparqlConnectionView
			connection={connection}
			showScopeSelector={showScopeSelector}
			hideHeader={hideHeader}
			onDirtyChange={onDirtyChange}
			initialCredential={initialCredential}
			testResult={testResult}
			isTesting={isTesting}
			inferenceEnabled={inferenceEnabled}
			fetchedMicrosoftCredential={fetchedMicrosoftCredential}
			onBack={onBack}
			onSaved={onSaved ?? onBack}
			onSave={(conn, cred) => messaging?.postMessage({ id: 'SaveSparqlConnection', connection: conn, credential: cred })}
			onUpdate={(conn) => messaging?.postMessage({ id: 'UpdateSparqlConnection', connection: conn })}
			onDelete={(conn) => messaging?.postMessage({ id: 'ExecuteCommand', command: 'mentor.command.deleteSparqlConnection', args: [conn] })}
			onRequestTest={(conn, cred) => {
				setIsTesting(true);
				setTestResult(undefined);
				messaging?.postMessage({ id: 'TestSparqlConnection', connection: conn, credential: cred });
			}}
			onRequestCredential={(id) => messaging?.postMessage({ id: 'GetSparqlConnectionCredential', connectionId: id })}
			onRequestInferenceEnabled={() => messaging?.postMessage({ id: 'GetInferenceFeatureEnabled' })}
			onToggleInference={(id) => messaging?.postMessage({ id: 'ToggleSparqlConnectionInference', connectionId: id })}
			onFetchMicrosoftCredential={(id, scopes) => messaging?.postMessage({ id: 'FetchMicrosoftAuthCredential', connectionId: id, scopes })}
		/>
	);
}