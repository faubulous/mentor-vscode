import "@vscode-elements/elements";
import type { ActivationFunction } from 'vscode-notebook-renderer';
import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';

export const activate: ActivationFunction = () => ({
	renderOutputItem(data, element) {
		createRoot(element).render(<SparqlResultsTable results={data?.json()} />);
	}
});
