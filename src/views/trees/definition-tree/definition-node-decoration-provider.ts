import * as vscode from 'vscode';
import { mentor } from '@src/mentor';

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {

	private readonly _disabledColor = new vscode.ThemeColor("disabledForeground");

	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		if (uri.scheme === 'mentor' || uri.scheme === 'file' || !mentor.activeContext) {
			return undefined;
		}

		const node = uri.toString();

		if (!mentor.activeContext.subjects[node]) {
			const result = new vscode.FileDecoration(undefined, undefined, this._disabledColor);
			result.propagate = false;
			result.tooltip = `This subject is not defined in the active document.`;

			return result;
		}
	}
}