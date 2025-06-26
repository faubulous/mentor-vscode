import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite';

export async function runSparqlQueryFromEditor(context: vscode.ExtensionContext): Promise<void> {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor found.');
		return;
	}

	const query = editor.document.getText();
	const source = mentor.store;
	const queryEngine = new QueryEngine();

	const result = await queryEngine.queryBindings(query, {
		sources: [source],
		unionDefaultGraph: true
	});

	const resultData = {
		type: 'bindings',
		data: await result.toArray({ limit: 100 })
	};

	// TODO: Move into new webview factory class replacing the existing webview provider.
	openSparqlResultsPanel(context, resultData);
}

function openSparqlResultsPanel(context: vscode.ExtensionContext, data?: any) {
	const panel = vscode.window.createWebviewPanel(
		'mentor.sparqlResultsPanel',
		'SPARQL Results',
		vscode.ViewColumn.Active,
		{
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')]
		}
	);

	const scriptUri = panel.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, 'out', 'sparql-results-webview.js')
	);
	const elementsUri = panel.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, 'out', 'vscode-elements.js')
	);

	panel.webview.html = `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="${elementsUri}" type="module"></script>
                <script src="${scriptUri}" type="module"></script>
            </head>
            <body>
                <div id="root"></div>
            </body>
        </html>`;

	if (data) {
		const disposable = panel.webview.onDidReceiveMessage(message => {
			if (message.type === 'ready') {
				panel.webview.postMessage(data);
				disposable.dispose(); // Clean up listener
			}
		});
	}
}
