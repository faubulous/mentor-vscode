import * as vscode from 'vscode';

/**
 * Retrieves the VS Code configuration section for the Mentor extension.
 * @returns The Mentor extension configuration.
 */
export function getConfig() {
	return vscode.workspace.getConfiguration('mentor');
}