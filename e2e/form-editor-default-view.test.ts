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
 * The documents these tests open. The other suites switch the fixture documents to the text
 * editor on purpose, which the default view remembers for the session, so these are written
 * fresh for this suite and removed afterwards.
 */
const OWN_DOCUMENTS = ['data/default-view-a.ttl', 'data/default-view-b.ttl'];

/**
 * The URI of a document of this suite.
 */
function ownDocument(index: number): vscode.Uri {
	return vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, OWN_DOCUMENTS[index]);
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

		for (const [index, path] of OWN_DOCUMENTS.entries()) {
			const text = `@prefix ex: <http://example.org/default-view#> .\n\nex:Thing${index} a ex:Thing .\n`;

			await vscode.workspace.fs.writeFile(ownDocument(index), Buffer.from(text, 'utf8'));
		}
	});

	suiteTeardown(async () => {
		for (const [index] of OWN_DOCUMENTS.entries()) {
			await vscode.workspace.fs.delete(ownDocument(index));
		}
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

	test('reopens every document opened in turn, in preview tabs as the explorer opens them', async () => {
		const first = ownDocument(0);
		const second = ownDocument(1);

		await setDefaultView('form');
		await vscode.commands.executeCommand('vscode.open', first, { preview: true });
		await waitFor(() => viewTypesOf(first).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the first document to reopen in the form editor' });

		await vscode.commands.executeCommand('vscode.open', second, { preview: true });
		await waitFor(() => viewTypesOf(second).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the second document to reopen in the form editor' });
	});

	test('reopens a document whose form editor was closed before', async () => {
		const uri = ownDocument(0);

		await setDefaultView('form');
		await vscode.commands.executeCommand('vscode.open', uri);
		await waitFor(() => viewTypesOf(uri).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the document to reopen in the form editor' });

		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		await vscode.commands.executeCommand('vscode.open', uri);
		await waitFor(() => viewTypesOf(uri).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the document to reopen in the form editor a second time' });
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
