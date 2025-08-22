import "@vscode-elements/elements";
import type { NotebookRendererMessaging } from 'vscode';
import type { ActivationFunction, OutputItem, RendererContext } from 'vscode-notebook-renderer';
import { createRoot } from 'react-dom/client';
import { WebviewMessaging } from "@/webviews/webview-messaging";
import { SparqlResultsView } from './sparql-results-view';
import { SparqlResultsWebviewMessages } from "./sparql-results-webview-messages";

export const activate: ActivationFunction = (context: RendererContext<NotebookRendererMessaging>) => {
	if (!context.postMessage || !context.onDidReceiveMessage) {
		throw new Error("This renderer requires a messaging context.");
	}

	const messaging: WebviewMessaging<SparqlResultsWebviewMessages> = {
		postMessage: (message: SparqlResultsWebviewMessages) => {
			context.postMessage?.(message);
		},
		onMessage: (handler: (message: SparqlResultsWebviewMessages) => void) => {
			context.onDidReceiveMessage?.(handler);
		},
	};

	return {
		renderOutputItem(data: OutputItem, element: HTMLElement) {
			const results = data?.json();
			const root = createRoot(element);
			root.render(
				<div className="mentor-notebook-cell">
					<SparqlResultsView messaging={messaging} queryContext={results} />
				</div>
			);
		}
	};
};