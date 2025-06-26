import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';

declare function acquireVsCodeApi(): {
	postMessage: (msg: any) => void;
	setState: (state: any) => void;
	getState: () => any;
};

const vscode = acquireVsCodeApi();
const root = createRoot(document.getElementById('root')!);

if (!vscode) {
	root.render(<div>Error: VS Code API not available.</div>);
} else {
	root.render(<div>Loading..</div>);
}

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
