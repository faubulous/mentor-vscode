import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { getUnusedPrefixes } from '@src/utilities/vscode/diagnostic';

export const cleanDocument = {
	id: 'mentor.command.cleanDocument',
	handler: async (documentUri?: vscode.Uri) => {
		const targetUri = documentUri ?? vscode.window.activeTextEditor?.document.uri;

		if (!targetUri) {
			vscode.window.showErrorMessage('No document selected.');
			return;
		}

		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === targetUri.toString())
			?? await vscode.workspace.openTextDocument(targetUri);

		const activeEditor = vscode.window.activeTextEditor?.document.uri.toString() === targetUri.toString()
			? vscode.window.activeTextEditor
			: undefined;

		// Clean step 1: remove unused prefixes (if any).
		await removeUnusedPrefixes(document);

		// Clean step 2: format document (if a formatter exists).
		await formatDocument(targetUri, activeEditor);
	}
};

async function removeUnusedPrefixes(document: vscode.TextDocument): Promise<boolean> {
	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const context = contextService.getDocumentContext(document, TurtleDocument);

	if (!context) {
		return false;
	}

	const unusedPrefixes = getUnusedPrefixes(document, context);

	if (unusedPrefixes.length === 0) {
		return false;
	}

	// Reuse existing command so behavior stays consistent.
	await vscode.commands.executeCommand('mentor.command.deletePrefixes', document.uri, unusedPrefixes);

	return true;
}

async function formatDocument(documentUri: vscode.Uri, editor?: vscode.TextEditor): Promise<boolean> {
	const tabSize = typeof editor?.options.tabSize === 'number' ? editor.options.tabSize : 2;
	const insertSpaces = typeof editor?.options.insertSpaces === 'boolean' ? editor.options.insertSpaces : true;

	const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
		'vscode.executeFormatDocumentProvider',
		documentUri,
		{ tabSize, insertSpaces }
	);

	if (!edits || edits.length === 0) {
		return false;
	}

	const edit = new vscode.WorkspaceEdit();
	edit.set(documentUri, edits);

	await vscode.workspace.applyEdit(edit);

	return true;
}