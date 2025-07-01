import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';

const root = createRoot(document.getElementById('root')!);

root.render(<div>Loading..</div>);

const vscode: VsCodeWebviewApi = acquireVsCodeApi();

let data = vscode.getState();

if (data) {
	root.render(<SparqlResultsTable results={data} />);
}

window.addEventListener('message', event => {
	const data = event.data;

	vscode.setState(data);

	if (data.type === 'bindings') {
		root.render(<SparqlResultsTable results={data} />);
	}
});

window.addEventListener('DOMContentLoaded', () => {
	vscode.postMessage({ type: 'ready' });
});
