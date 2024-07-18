import * as vscode from 'vscode';
import * as mentor from '../mentor';

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {
	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		if (!uri || !mentor.activeContext || uri.scheme === 'file') {
			return undefined;
		} else if (mentor.vocabulary.hasShapes(mentor.activeContext.graphs, uri.toString())) {
			return {
				badge: '⬡',
				propagate: false
			};
		}
	}
}