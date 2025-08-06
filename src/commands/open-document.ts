import * as vscode from 'vscode';

export async function openDocument(documentIri: string) {
	if (!documentIri) {
		vscode.window.showErrorMessage('No document IRI provided.');
		return;
	}

	try {
		const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentIri));

		await vscode.window.showTextDocument(document);
	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to open document: ${error.message}`);
	}
}