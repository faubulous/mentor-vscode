import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { SparqlResultsTable } from './sparql-results-table';
import { WebviewMessagingApi } from './webview-messaging';
import { SparqlQueryResults } from '@/services';

function SparqlResultsWebview() {
	const [state, setState] = useState<SparqlResultsWebviewState>({ renderKey: 0 });

	const [messaging] = useState<WebviewMessagingApi>(() => {
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
		const handleMessage = (data: SparqlQueryResults) => {
			setState(prevState => ({ data, renderKey: (prevState.renderKey || 0) + 1 }));
		};

		const cleanup = messaging.onMessage(handleMessage);

		return cleanup;
	}, []);

	if (state.data) {
		return <SparqlResultsTable results={state.data} messaging={messaging} />;
	} else {
		return <div>No query was executed yet.</div>;
	}
}

interface SparqlResultsWebviewState {
	data?: SparqlQueryResults;
	renderKey?: number;
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsWebview />);