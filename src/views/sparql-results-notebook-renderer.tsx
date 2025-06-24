import type { ActivationFunction } from 'vscode-notebook-renderer';
import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';
import "@vscode-elements/elements";

export const activate: ActivationFunction = () => ({
	renderOutputItem(data, element) {
		const root = createRoot(element);
		root.render(<SparqlResultsTable results={data?.json()} />);
	}
});
