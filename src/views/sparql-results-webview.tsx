import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { SparqlResultsTable } from './sparql-results-table';
import { WebviewMessagingApi } from './webview-messaging';

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
		const handleMessage = (data: any) => {
			if (data.type === 'bindings') {
				// Increment the key to force a re-mount of the child component
				setState(prevState => ({
					status: 'data',
					data,
					renderKey: (prevState.renderKey || 0) + 1
				}));
			} else if (data.type === 'error') {
				setState(prevState => ({
					status: 'error',
					errorMessage: data.message,
					renderKey: (prevState.renderKey || 0) + 1
				}));
			} else if (data.type === 'loading') {
				setState({ status: undefined, data: undefined, errorMessage: undefined, renderKey: 0 });
			}
		};

		const cleanup = messaging.onMessage(handleMessage);

		return cleanup;
	}, [messaging]);

	switch (state.status) {
		case 'error':
			return <div>Error: {state.errorMessage}</div>;
		case 'data':
			// The unique key ensures the component re-renders when new data arrives.
			return <SparqlResultsTable key={state.renderKey} results={state.data} messaging={messaging} />;
		default:
			return <div>Waiting for query results...</div>;
	}
}

interface SparqlResultsWebviewState {
	status?: 'data' | 'error';
	data?: any;
	errorMessage?: string;
	renderKey?: number;
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsWebview />);