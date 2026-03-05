import * as vscode from 'vscode';

/**
 * Get the delta of lines caused by a workspace edit.
 * @param edit A workspace edit.
 * @returns The delta of lines caused by the edit.
 */
export function calculateLineOffset(edit: vscode.WorkspaceEdit): number {
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