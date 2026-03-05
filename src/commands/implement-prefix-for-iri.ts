import * as vscode from 'vscode';
import { container } from '../container';
import { IToken } from 'chevrotain';
import { TurtlePrefixDefinitionService } from '../languages/turtle/services/turtle-prefix-definition-service';
import { getTokenPosition } from '@src/utilities';
import { calculateLineOffset } from '@src/utilities/edit';

export const implementPrefixForIri = {
	id: 'mentor.command.implementPrefixForIri',
	handler: async (documentUri: vscode.Uri, namespaceIri: string, token: IToken) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const editor = vscode.window.activeTextEditor;
			const service = container.resolve(TurtlePrefixDefinitionService);
			const edit = await service.implementPrefixForIri(document, namespaceIri);

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