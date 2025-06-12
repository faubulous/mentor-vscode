import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite';
import { sparqlResultsViewProvider } from '@/views/sparql-results-view-provider';

export async function executeSparqlQueryFromEditor(): Promise<void> {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor found.');
		return;
	}

	const query = editor.document.getText();
	const source = mentor.store;
	const queryEngine = new QueryEngine();

	const bindings = await queryEngine.queryBindings(query, {
		sources: [source],
		unionDefaultGraph: true
	});

	const results = await bindings.toArray();

	sparqlResultsViewProvider.reveal();
	sparqlResultsViewProvider.postMessage({ type: 'setTableData', data: results });
}
