import { mentor } from '@/mentor';
import * as vscode from 'vscode';

export async function restoreUntitledDocument(documentIri: string, content: string) {
	if (documentIri.startsWith('untitled:')) {
		// Try to find the document in the open document list, if already opened.
		let document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentIri);

		if (!document || document.getText() !== content) {
			// Create new untitled document with content.
			document = await vscode.workspace.openTextDocument({
				language: 'sparql',
				content: content
			});
		}

		await vscode.window.showTextDocument(document);

		// Update the query state with the new document IRI.
		const queryState = mentor.sparqlQueryService.getQueryState(documentIri);

		if (queryState) {
			queryState.documentIri = document.uri.toString();

			mentor.sparqlQueryService.updateQueryState(queryState);
		}

		return document.uri.toString();
	}
}