import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { executeDescribeQuery } from './execute-describe-query';

/**
 * Runs a DESCRIBE query for the resource (IRI or prefixed name) at the editor caret.
 * Invoked from the editor context menu; a right-click moves the caret to the clicked
 * token first, so the caret position identifies the clicked resource.
 */
export const describeResourceFromPosition = {
	id: 'mentor.command.describeResourceFromPosition',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const context = contextService.contexts[editor.document.uri.toString()];

		const iri = context?.getIriAtPosition(editor.selection.active);

		if (!iri) {
			vscode.window.showInformationMessage('No resource at the cursor position.');
			return;
		}

		await executeDescribeQuery.handler(editor.document.uri, iri);
	}
};
