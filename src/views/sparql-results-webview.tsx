import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';
import { WebviewMessagingApi } from './webview-messaging';

const root = createRoot(document.getElementById('root')!);

root.render(<div>Loading..</div>);

const vscode: WebviewApi = acquireVsCodeApi();
const messaging: WebviewMessagingApi = {
	postMessage: (message) => vscode.postMessage(message),
	onMessage: (handler) => window.addEventListener('message', (e) => handler(e.data)),
};

let data = vscode.getState();

if (data) {
	root.render(<SparqlResultsTable results={data} messaging={messaging} />);
}

messaging.onMessage((data) => {
	if (data.type === 'bindings') {
		vscode.setState(data);

		root.render(<SparqlResultsTable results={data} messaging={messaging} />);
	} else if (data.type === 'error') {
		root.render(<div>Error: {data.message}</div>);
	} else if (data.type === 'loading') {
		root.render(<div>Loading...</div>);
	}
});

window.addEventListener('DOMContentLoaded', () => {
	messaging.postMessage({ type: 'ready' });
});
