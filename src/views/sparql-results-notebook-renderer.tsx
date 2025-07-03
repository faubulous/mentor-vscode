import "@vscode-elements/elements";
import type { NotebookRendererMessaging } from 'vscode';
import type { ActivationFunction, OutputItem, RendererContext } from 'vscode-notebook-renderer';
import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';

export const activate: ActivationFunction = (context: RendererContext<NotebookRendererMessaging>) => {
	const messaging = context.postMessage ? {
		postMessage: (msg: any) => context.postMessage!(msg),
		onMessage: (handler: (msg: any) => void) => {
			return context.onDidReceiveMessage?.(handler);
		},
	} : undefined;

	return {
		renderOutputItem(data: OutputItem, element: HTMLElement) {
			createRoot(element).render(
				<SparqlResultsTable
					results={data?.json()}
					messaging={messaging}
				/>
			);
		}
	};
};