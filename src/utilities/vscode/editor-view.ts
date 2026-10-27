import * as vscode from 'vscode';

/**
 * Show a resource in a particular editor and close the tabs showing it in another one.
 *
 * `vscode.openWith` does not replace an existing editor for the resource: it opens a second tab
 * in the same group and activates it. For a view switch that is wrong — toggling twice would
 * leave the user with two editors for one file — so the tabs showing the other view are closed
 * afterwards.
 *
 * A document with unsaved changes is left alone: closing its editor discards the changes, and no
 * view switch is worth losing work for. The extra tab is a visible, recoverable nuisance; a lost
 * edit is neither.
 * @param uri The resource to show.
 * @param viewType The editor to show it in, or `'default'` for the text editor.
 */
export async function switchEditorView(uri: vscode.Uri, viewType: string): Promise<void> {
	await vscode.commands.executeCommand('vscode.openWith', uri, viewType);

	if (_isDirty(uri)) {
		return;
	}

	const stale = _findTabsForOtherView(uri, viewType);

	if (stale.length > 0) {
		await vscode.window.tabGroups.close(stale, true);
	}
}

/**
 * Indicate whether a resource has unsaved changes.
 * @param uri The resource to check.
 * @returns `true` if the document is open with unsaved changes, `false` otherwise.
 */
function _isDirty(uri: vscode.Uri): boolean {
	const target = uri.toString();

	return vscode.workspace.textDocuments.some(document => document.uri.toString() === target && document.isDirty);
}

/**
 * Find the tabs that show a resource in an editor other than the given one.
 * @param uri The resource to look for.
 * @param viewType The editor that should remain open.
 * @returns The tabs to close.
 */
function _findTabsForOtherView(uri: vscode.Uri, viewType: string): vscode.Tab[] {
	const result: vscode.Tab[] = [];
	const target = uri.toString();

	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			const input = tab.input as { uri?: vscode.Uri; viewType?: string } | undefined;

			if (input?.uri?.toString() !== target) {
				continue;
			}

			// A text editor tab carries no view type, so `default` matches exactly those.
			const tabViewType = input.viewType ?? 'default';

			if (tabViewType !== viewType) {
				result.push(tab);
			}
		}
	}

	return result;
}
