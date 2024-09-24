import * as vscode from 'vscode';

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {
	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		return undefined;
	}
}