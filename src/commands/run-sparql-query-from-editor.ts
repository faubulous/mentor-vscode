import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { SparqlResultsViewFactory } from '@/views';

export async function runSparqlQueryFromEditor(context: vscode.ExtensionContext): Promise<void> {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor found.');
		return;
	}

	const documentIri = editor.document.uri.toString();
	const query = editor.document.getText();

	const results = await mentor.sparqlQueryService.executeQuery(query, documentIri);
	const panel = new SparqlResultsViewFactory().createWebviewPanel(context);

	const disposable = panel.webview.onDidReceiveMessage(message => {
		if (message.type === 'ready') {
			panel.webview.postMessage(results);

			disposable.dispose();
		}
	});
}