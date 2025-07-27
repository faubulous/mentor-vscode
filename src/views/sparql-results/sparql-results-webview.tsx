import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { WebviewMessagingApi } from '@/views/webview-messaging';
import { SparqlQueryContext } from '@/services';
import { SparqlResultsTable } from './sparql-results-table';
import { SparqlResultsWelcomeView } from './sparql-results-welcome-view';

interface SparqlResultsWebviewState {
	data?: SparqlQueryContext;
	renderKey?: number;
}

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
		const handleMessage = (data: SparqlQueryContext) => {
			setState(prevState => ({ data, renderKey: (prevState.renderKey || 0) + 1 }));
		};

		const cleanup = messaging.onMessage(handleMessage);

		return cleanup;
	}, []);

	if (state.data) {
		return <SparqlResultsTable messaging={messaging} queryContext={state.data} />;
	} else {
		return <SparqlResultsWelcomeView messaging={messaging} />;
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsWebview />);