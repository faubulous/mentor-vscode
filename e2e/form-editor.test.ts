import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor } from './helpers';

const FORM_EDITOR_VIEW_TYPE = 'mentor.formEditor';

/**
 * Resolve the fixture ontology in the opened workspace.
 */
async function getFixtureUri(): Promise<vscode.Uri> {
	const matches = await vscode.workspace.findFiles('data/ontology.ttl', undefined, 1);

	assert.ok(matches.length === 1, 'the fixture ontology must exist in the workspace');

	return matches[0];
}

/**
 * The tabs showing a resource, whichever kind of editor holds it.
 */
function findTabs(uri: vscode.Uri): vscode.Tab[] {
	const tabs: vscode.Tab[] = [];

	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			const input = tab.input as { uri?: vscode.Uri } | undefined;

			if (input?.uri?.toString() === uri.toString()) {
				tabs.push(tab);
			}
		}
	}

	return tabs;
}

/**
 * Whether a tab shows the form editor.
 */
function isFormEditorTab(tab: vscode.Tab | undefined): boolean {
	return (tab?.input as { viewType?: string } | undefined)?.viewType === FORM_EDITOR_VIEW_TYPE;
}

/**
 * The form editor is a custom text editor over the ordinary text document. These tests pin the
 * assumptions the feature is built on: that opening the form replaces the text editor in the
 * same tab rather than adding one, and that a focused form editor leaves no active text editor,
 * which is why the RDF editor actions are gated on `activeCustomEditorId` as well.
 */
suite('form editor', () => {
	suiteSetup(async () => {
		await activateMentor();
	});

	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('opens an RDF document in the form editor', async () => {
		const uri = await getFixtureUri();

		await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
		await waitFor(() => isFormEditorTab(findTabs(uri)[0]), { label: 'the form editor tab to open' });

		assert.strictEqual(vscode.window.activeTextEditor, undefined, 'a focused form editor must leave no active text editor');
	});

	test('leaves one tab per document when switching views', async () => {
		const uri = await getFixtureUri();

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
		await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
		await waitFor(() => findTabs(uri).length === 1 && isFormEditorTab(findTabs(uri)[0]), { label: 'the text editor tab to be replaced' });

		await vscode.commands.executeCommand('mentor.command.openTextEditor', uri);
		await waitFor(() => vscode.window.activeTextEditor?.document.uri.toString() === uri.toString(), { label: 'the text editor to become active' });

		assert.strictEqual(findTabs(uri).length, 1, 'switching the view must not leave a second tab behind');
	});

	test('never discards unsaved changes to switch the view', async () => {
		const uri = await getFixtureUri();
		const document = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(document);

		await editor.edit(builder => builder.insert(new vscode.Position(0, 0), '# scratch\n'));

		assert.ok(document.isDirty, 'the document must be dirty before the switch');

		await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
		await waitFor(() => findTabs(uri).some(isFormEditorTab), { label: 'the form editor to open' });

		// The text editor tab is kept for a dirty document, because closing it would discard the
		// edit. Correctness beats tidiness here.
		assert.ok(document.isDirty, 'unsaved changes must survive the switch to the form editor');

		await vscode.commands.executeCommand('workbench.action.files.revert');
	});

	test('keeps the RDF editor actions working while the form editor is focused', async () => {
		const uri = await getFixtureUri();

		await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
		await waitFor(() => {
			const active = vscode.window.tabGroups.activeTabGroup.activeTab;
			const input = active?.input as { uri?: vscode.Uri } | undefined;

			return isFormEditorTab(active) && input?.uri?.toString() === uri.toString() && vscode.window.activeTextEditor === undefined;
		}, { label: 'the form editor to be the active tab' });

		// The command resolves its document from the active tab when there is no text editor.
		await vscode.commands.executeCommand('mentor.command.createSparqlQueryFromDocument');
		await waitFor(() => vscode.window.activeTextEditor?.document.languageId === 'sparql', { label: 'a SPARQL query to be created from the form editor' });
	});
});
