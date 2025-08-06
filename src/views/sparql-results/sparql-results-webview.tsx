import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { WebviewMessaging } from '@/views/webview-messaging';
import { SparqlQueryState } from '@/services/sparql-query-state';
import { SparqlResultsTable } from './sparql-results-table';
import { SparqlResultsWelcomeView } from './sparql-results-welcome-view';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';

interface SparqlResultsWebviewState {
	renderKey?: number;

	queryState?: SparqlQueryState;
}

/**
 * Main webview component for displaying SPARQL query results and history. This component 
 * renders either a table of SPARQL query results when queries are executed from files, or 
 * a welcome view showing the history of previous queries when no active results are present.
 * 
 * It handles bidirectional messaging between the webview and VS Code extension host to 
 * execute commands and retrieve SPARQL query history, automatically switching between the 
 * results table and welcome view based on the incoming message type and data.
 * 
 * @returns A React component that renders either query results or the welcome view
 */
function SparqlResultsWebview() {
	const [state, setState] = useState<SparqlResultsWebviewState>({ renderKey: 0 });

	const [messaging] = useState<WebviewMessaging<SparqlResultsWebviewMessages>>(() => {
		const vscode = acquireVsCodeApi();

		return {
			postMessage: (message) => vscode.postMessage(message),
			onMessage: (handler) => {
				const messageHandler = (event: MessageEvent) => handler(event.data);

				window.addEventListener('message', messageHandler);

				return () => window.removeEventListener('message', messageHandler);
			},
		};
	});

	useEffect(() => {
		const handleMessage = (message: SparqlResultsWebviewMessages) => {
			switch (message.id) {
				case 'SetSparqlQueryState': {
					setState(prevState => ({
						renderKey: (prevState.renderKey || 0) + 1,
						queryState: message.queryState
					}));
					break;
				}
			}
		};

		const cleanup = messaging.onMessage(handleMessage);

		return cleanup;
	}, []);

	if (state.queryState) {
		return <SparqlResultsTable messaging={messaging} queryContext={state.queryState} />;
	} else {
		return <SparqlResultsWelcomeView messaging={messaging} />;
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsWebview />);