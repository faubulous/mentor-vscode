import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from './helpers';

/**
 * Renaming an IRI with `mentor.editor.renameAcrossFiles` enabled must also rename it in
 * the indexed files that reference it. `data/instances.ttl` is indexed but never opened,
 * so its tokens are released and its text is read from disk for the edits.
 */
suite('rename across files', () => {
	let ontologyUri: vscode.Uri;
	let instancesUri: vscode.Uri;

	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();

		const workspaceFolder = vscode.workspace.workspaceFolders![0];

		ontologyUri = vscode.Uri.joinPath(workspaceFolder.uri, 'data', 'ontology.ttl');
		instancesUri = vscode.Uri.joinPath(workspaceFolder.uri, 'data', 'instances.ttl');

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(ontologyUri));
	});

	teardown(async () => {
		await vscode.workspace.getConfiguration('mentor').update('editor.renameAcrossFiles', undefined, vscode.ConfigurationTarget.Global);
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	/**
	 * Renames `ex:Thing` in the ontology to `ex:Entity` without applying the edit, and
	 * returns the text edits per file name.
	 */
	async function renameThing(): Promise<Map<string, vscode.TextEdit[]>> {
		// `ex:Thing a owl:Class ;` is on line 8 of the ontology; the cursor is inside `Thing`.
		// Until the opened document is parsed again, rename rejects with "No token found".
		const edit = await waitFor<vscode.WorkspaceEdit | false>(async () => {
			try {
				const result = await vscode.commands.executeCommand<vscode.WorkspaceEdit>('vscode.executeDocumentRenameProvider', ontologyUri, new vscode.Position(7, 4), 'Entity');

				return result !== undefined && result.size > 0 && result;
			} catch {
				return false;
			}
		}, { label: 'the rename edits of the ontology', timeoutMs: 10000 }) as vscode.WorkspaceEdit;

		return new Map(edit.entries().map(([uri, edits]) => [uri.path.split('/').pop()!, edits]));
	}

	test('renames the IRI in the other indexed files', async () => {
		await vscode.workspace.getConfiguration('mentor').update('editor.renameAcrossFiles', true, vscode.ConfigurationTarget.Global);

		const edits = await renameThing();
		const instanceEdits = edits.get('instances.ttl') ?? [];
		const instancesText = new TextDecoder().decode(await vscode.workspace.fs.readFile(instancesUri));
		const instancesLines = instancesText.split(/\r?\n/);
		const occurrences = instancesText.match(/\bex:Thing\b/g)?.length ?? 0;

		assert.strictEqual(edits.get('ontology.ttl')?.length, 2, 'both occurrences in the ontology are renamed');
		assert.ok(occurrences > 0, 'the instances fixture references ex:Thing');
		assert.strictEqual(instanceEdits.length, occurrences, 'every occurrence in the instances is renamed');

		for (const textEdit of instanceEdits) {
			const { start, end } = textEdit.range;

			assert.strictEqual(instancesLines[start.line].substring(start.character, end.character), 'Thing');
			assert.strictEqual(textEdit.newText, 'Entity');
		}
	});

	test('keeps the rename within the document when the setting is disabled', async () => {
		await vscode.workspace.getConfiguration('mentor').update('editor.renameAcrossFiles', false, vscode.ConfigurationTarget.Global);

		const edits = await renameThing();

		assert.strictEqual(edits.get('ontology.ttl')?.length, 2);
		assert.strictEqual(edits.has('instances.ttl'), false);
	});
});
