import * as vscode from 'vscode';
import { TextEditSpec } from '@src/utilities/text-edits';

/**
 * Get the delta of lines caused by a workspace edit.
 * @param edit A workspace edit.
 * @returns The delta of lines caused by the edit.
 */
export function calculateLineOffset(edit: vscode.WorkspaceEdit): number {
	let lineOffset = 0;

	for (const [, edits] of edit.entries()) {
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

/**
 * Convert offset based edits into one workspace edit for a document, so that a user action is
 * applied and undone as a single step.
 * @param document The document the edits were synthesized against.
 * @param edits The edits to convert.
 */
export function toWorkspaceEdit(document: vscode.TextDocument, edits: readonly TextEditSpec[]): vscode.WorkspaceEdit {
	const workspaceEdit = new vscode.WorkspaceEdit();

	for (const edit of edits) {
		const range = new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end));

		workspaceEdit.replace(document.uri, range, edit.newText);
	}

	return workspaceEdit;
}
