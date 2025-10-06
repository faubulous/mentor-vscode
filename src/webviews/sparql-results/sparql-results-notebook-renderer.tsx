import "@vscode-elements/elements";
import type { NotebookRendererMessaging } from 'vscode';
import type { ActivationFunction, OutputItem, RendererContext } from 'vscode-notebook-renderer';
import { createRoot } from 'react-dom/client';
import { WebviewMessaging } from "@/webviews/webview-messaging";
import { SparqlResultsView } from './components/sparql-results-view';
import { SparqlResultsWebviewMessages } from "./sparql-results-messages";

// Associates created React roots with HTML elements.
const elementRoots = new WeakMap<HTMLElement, ReturnType<typeof createRoot>>();

export const activate: ActivationFunction = (context: RendererContext<NotebookRendererMessaging>) => {
    if (!context.postMessage || !context.onDidReceiveMessage) {
        throw new Error("This renderer requires a messaging context.");
    }

    const messaging: WebviewMessaging<SparqlResultsWebviewMessages> = {
        postMessage: (message: SparqlResultsWebviewMessages) => {
            if (context.postMessage) {
                context.postMessage(message);
            } else {
                console.warn('No postMessage function available in context.');
            }
        },
        onMessage: (handler: (message: SparqlResultsWebviewMessages) => void) => {
            if(context.onDidReceiveMessage) {
                context.onDidReceiveMessage(handler);
            } else {
                console.warn('No onDidReceiveMessage function available in context.');
            }
        },
    };

    return {
        renderOutputItem(data: OutputItem, element: HTMLElement) {
            const json = data?.json();

            let root = elementRoots.get(element);

            if (!root) {
                root = createRoot(element);
                elementRoots.set(element, root);
            }

            root.render(
                <div className="mentor-notebook-output">
                    <SparqlResultsView
                        messaging={messaging}
                        queryContext={json}
                        defaultPageSize={50} />
                </div>
            );
        }
    };
};