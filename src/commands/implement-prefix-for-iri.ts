import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { IToken } from 'millan';
import { getTokenPosition } from '@src/utilities';

/**
 * Get the delta of lines caused by a workspace edit.
 * @param edit A workspace edit.
 * @returns The delta of lines caused by the edit.
 */
function calculateLineOffset(edit: vscode.WorkspaceEdit): number {
	let lineOffset = 0;

	for (const [uri, edits] of edit.entries()) {
		for (const e of edits) {
			const startLine = e.range.start.line;
			const endLine = e.range.end.line;

			if (e.newText === '') {
				// Deletion
				lineOffset -= (endLine - startLine);
			} else {
				// Insertion or Replacement
				const newLines = e.newText.split('\n').length - 1;
				lineOffset += newLines - (endLine - startLine);
			}
		}
	}

	return lineOffset;
}

export const implementPrefixForIri = {
	commandId: 'mentor.command.implementPrefixForIri',
	handler: async (documentUri: vscode.Uri, namespaceIri: string, token: IToken) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const editor = vscode.window.activeTextEditor;
			const edit = await mentor.prefixDeclarationService.implementPrefixForIri(document, namespaceIri);

			if (editor && edit.size > 0) {
				// Await the edit application, after this the document is changed and the token position is invalid.
				const success = await vscode.workspace.applyEdit(edit);

				if (success) {
					// The token position is valid for the unedited document.
					const position = getTokenPosition(token);

					// Calculate the line offset caused by the edit.
					const lineOffset = calculateLineOffset(edit);
					const start = new vscode.Position(position.start.line + lineOffset, position.start.character);

					// Set the cursor the the start of the original IRI token which is now the prefix.
					editor.selection = new vscode.Selection(start, start);

					// Trigger renaming the prefix.
					vscode.commands.executeCommand('editor.action.rename');
				}
			}
		}
	}
};