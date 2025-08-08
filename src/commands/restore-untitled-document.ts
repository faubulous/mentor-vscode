import { mentor } from '@/mentor';
import * as vscode from 'vscode';

export async function restoreUntitledDocument(documentIri: string, content: string) {
	if (documentIri.startsWith('untitled:')) {
		// Create new untitled document with content.
		const document = await vscode.workspace.openTextDocument({
			language: 'sparql',
			content: content
		});

		await vscode.window.showTextDocument(document);

		// Update the query state with the new document IRI.
		const queryState = mentor.sparqlQueryService.getQueryState(documentIri);

		if (queryState) {
			queryState.documentIri = document.uri.toString();

			mentor.sparqlQueryService.updateQueryState(queryState);
		}
	}
}