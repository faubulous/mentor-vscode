import * as vscode from 'vscode';
import { SparqlQueryContext } from '@/services';

export async function saveSparqlQueryResults(results: SparqlQueryContext): Promise<void> {
	let content = '';

	// Render the variable names as the first row
	for (const column of results.columns) {
		content += `${column}, `;
	}

	// Remove the last comma and add a newline
	content = content.slice(0, -2) + '\n';

	// Render the results
	for (const row of results.rows) {
		for (const column of results.columns) {
			content += `${row[column].value || ''}, `;
		}

		// Remove the last comma and add a newline
		content = content.slice(0, -2) + '\n';
	}

	const document = await vscode.workspace.openTextDocument({ content, language: 'csv' });

	await vscode.window.showTextDocument(document, { preview: false });
}