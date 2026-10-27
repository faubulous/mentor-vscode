import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor } from './helpers';

const FORM_EDITOR_VIEW_TYPE = 'mentor.formEditor';

/**
 * The view types of the tabs showing a resource.
 */
function viewTypesOf(uri: vscode.Uri): string[] {
	const viewTypes: string[] = [];

	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			const input = tab.input as { uri?: vscode.Uri; viewType?: string } | undefined;

			if (input?.uri?.toString() === uri.toString()) {
				viewTypes.push(input.viewType ?? 'text');
			}
		}
	}

	return viewTypes;
}

/**
 * Set the default view for the rest of the test.
 */
async function setDefaultView(view: string | undefined): Promise<void> {
	await vscode.workspace.getConfiguration('mentor').update('formEditor.defaultView', view, vscode.ConfigurationTarget.Global);
}

/**
 * With the form editor configured as the default view, opening an RDF document as text reopens it
 * in the form editor, and switching back to the text editor is respected for the session.
 */
suite('form editor default view', () => {
	suiteSetup(async () => {
		await activateMentor();
	});

	teardown(async () => {
		await setDefaultView(undefined);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('opens an RDF document in the form editor by default', async () => {
		const [uri] = await vscode.workspace.findFiles('data/instances.ttl', undefined, 1);

		await setDefaultView('form');
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
		await waitFor(() => viewTypesOf(uri).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the document to reopen in the form editor' });

		assert.strictEqual(vscode.window.activeTextEditor, undefined, 'the form editor must have replaced the text editor');
	});

	test('keeps the text editor the user switched to', async () => {
		const [uri] = await vscode.workspace.findFiles('data/instances.ttl', undefined, 1);

		await setDefaultView('form');
		await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
		await waitFor(() => viewTypesOf(uri).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the form editor to open' });

		await vscode.commands.executeCommand('mentor.command.openTextEditor', uri);
		await waitFor(() => vscode.window.activeTextEditor?.document.uri.toString() === uri.toString(), { label: 'the text editor to become active' });

		// Give the default view every chance to undo the switch, which it must not.
		await new Promise(resolve => setTimeout(resolve, 500));

		assert.deepStrictEqual(viewTypesOf(uri), ['text'], 'the text editor the user switched to must stay');
	});
});
