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
 * The documents these tests open, written fresh for this suite and removed afterwards.
 */
const OWN_DOCUMENTS = ['data/default-view-a.ttl', 'data/default-view-b.ttl'];

/**
 * The URI of a document of this suite.
 */
function ownDocument(index: number): vscode.Uri {
	return vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, OWN_DOCUMENTS[index]);
}

/**
 * The editor Turtle files are associated with, if any.
 */
function turtleAssociation(): string | undefined {
	return vscode.workspace.getConfiguration('workbench').get<Record<string, string>>('editorAssociations')?.['*.ttl'];
}

/**
 * Set the default view and wait until the editor associations follow it.
 * @param view The default view, or `undefined` to reset the setting.
 */
async function setDefaultView(view: 'form' | undefined): Promise<void> {
	await vscode.workspace.getConfiguration('mentor').update('formEditor.defaultView', view, vscode.ConfigurationTarget.Global);
	await waitFor(() => (turtleAssociation() === FORM_EDITOR_VIEW_TYPE) === (view === 'form'), { label: `the editor associations to follow the default view '${view}'` });
}

/**
 * With the form editor configured as the default view, the RDF file types are associated with it,
 * so VS Code opens a document in the form editor right away and reveals an open form instead of
 * opening a text editor beside it. A switch to the text editor is a one-off that VS Code leaves
 * alone.
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

	test('opens an RDF document in the form editor right away, without a text editor first', async () => {
		const uri = ownDocument(0);

		await setDefaultView('form');
		await vscode.commands.executeCommand('vscode.open', uri);

		assert.deepStrictEqual(viewTypesOf(uri), [FORM_EDITOR_VIEW_TYPE], 'the document must open in the form editor and nothing else');
		assert.strictEqual(vscode.window.activeTextEditor, undefined, 'no text editor must have been opened for it');
	});

	test('reveals the open form of a document instead of opening a text editor beside it', async () => {
		const first = ownDocument(0);
		const second = ownDocument(1);

		await setDefaultView('form');
		await vscode.commands.executeCommand('vscode.open', first, { preview: false });
		await waitFor(() => viewTypesOf(first).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the first document to open in the form editor' });
		await vscode.commands.executeCommand('vscode.open', second, { preview: false });
		await waitFor(() => viewTypesOf(second).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the second document to open in the form editor' });
		await vscode.commands.executeCommand('vscode.open', first, { preview: false });
		await new Promise(resolve => setTimeout(resolve, 500));

		assert.deepStrictEqual(viewTypesOf(first), [FORM_EDITOR_VIEW_TYPE], 'the first document must still have exactly its form editor');
		assert.deepStrictEqual(viewTypesOf(second), [FORM_EDITOR_VIEW_TYPE], 'the second document must keep its form editor');
	});

	test('opens an RDF document in the text editor again once the text editor is the default', async () => {
		const uri = ownDocument(1);

		await setDefaultView('form');
		await setDefaultView(undefined);
		await vscode.commands.executeCommand('vscode.open', uri);

		assert.deepStrictEqual(viewTypesOf(uri), ['text']);
	});

	test('keeps the text editor the user switched to', async () => {
		const [uri] = await vscode.workspace.findFiles('data/instances.ttl', undefined, 1);

		await setDefaultView('form');
		await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
		await waitFor(() => viewTypesOf(uri).join(',') === FORM_EDITOR_VIEW_TYPE, { label: 'the form editor to open' });

		await vscode.commands.executeCommand('mentor.command.openTextEditor', uri);
		await waitFor(() => vscode.window.activeTextEditor?.document.uri.toString() === uri.toString(), { label: 'the text editor to become active' });

		// Give anything that might undo the switch every chance, which nothing must.
		await new Promise(resolve => setTimeout(resolve, 500));

		assert.deepStrictEqual(viewTypesOf(uri), ['text'], 'the text editor the user switched to must stay');
	});
});
