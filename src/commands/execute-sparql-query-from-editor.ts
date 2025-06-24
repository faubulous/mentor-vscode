import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite';
import { sparqlResultsViewProvider } from '@/views';

export async function executeSparqlQueryFromEditor(): Promise<void> {
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

	sparqlResultsViewProvider.reveal();
	sparqlResultsViewProvider.postMessage({ type: 'setTableData', data: resultData });
}
