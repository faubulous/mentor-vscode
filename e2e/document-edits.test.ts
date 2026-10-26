import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, countGraphTriples, getMentorState, waitFor, waitForIndexing } from './helpers';

/**
 * Editing an open document updates its graph in the store: only the triples that changed
 * are applied, and the graph returns to its previous state when the edit is undone.
 */
suite('document edits', () => {
	let ontologyUri: vscode.Uri;
	let graphIri: string;

	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();

		ontologyUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'data', 'ontology.ttl');

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(ontologyUri));

		const { storeGraphs } = await getMentorState();

		graphIri = storeGraphs.find(graph => graph.endsWith('/data/ontology.ttl'))!;

		assert.ok(graphIri, 'the ontology is indexed into its graph');
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.files.revert');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('applies an added triple and removes it again on undo', async () => {
		const tripleCount = await countGraphTriples(graphIri);
		const document = await vscode.workspace.openTextDocument(ontologyUri);
		const edit = new vscode.WorkspaceEdit();

		edit.insert(ontologyUri, document.positionAt(document.getText().length), '\nex:Edited a owl:Class .\n');

		await vscode.workspace.applyEdit(edit);
		await waitFor(async () => await countGraphTriples(graphIri) === tripleCount + 1, { label: 'the added triple', timeoutMs: 10000 });

		await vscode.commands.executeCommand('undo');
		await waitFor(async () => await countGraphTriples(graphIri) === tripleCount, { label: 'the undone triple', timeoutMs: 10000 });
	});
});
