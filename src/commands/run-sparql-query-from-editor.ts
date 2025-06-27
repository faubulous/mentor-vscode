import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite';
import { SparqlResultsViewFactory } from '@/views';

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
		data: await result.toArray({ limit: 100 }),
		documentIri: editor.document.uri.toString(),
		query: query
	};

	const panel = new SparqlResultsViewFactory().createWebviewPanel(context);

	const disposable = panel.webview.onDidReceiveMessage(message => {
		if (message.type === 'ready') {
			panel.webview.postMessage(resultData);

			disposable.dispose();
		}
	});
}
