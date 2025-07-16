import "@vscode-elements/elements";
import type { NotebookRendererMessaging } from 'vscode';
import type { ActivationFunction, OutputItem, RendererContext } from 'vscode-notebook-renderer';
import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';

export const activate: ActivationFunction = (context: RendererContext<NotebookRendererMessaging>) => {
	const messaging = context.postMessage ? {
		postMessage: (message: any) => context.postMessage!(message),
		onMessage: (handler: (message: any) => void) => {
			return context.onDidReceiveMessage?.(handler);
		},
	} : undefined;

	return {
		renderOutputItem(data: OutputItem, element: HTMLElement) {
			const results = data?.json();

			const root = createRoot(element);
			root.render(<SparqlResultsTable results={results} messaging={messaging} />);
		}
	};
};