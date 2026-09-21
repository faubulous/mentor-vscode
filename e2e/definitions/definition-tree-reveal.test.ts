import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from '../helpers';

/**
 * The state of the definition tree returned by the `mentor.e2e.getDefinitionTreeState` command.
 */
interface DefinitionTreeState {
	visible: boolean;
	selection: string[];
	activeContext?: string;
}

/**
 * Reads the state of the definition tree through the test-only command.
 */
function getDefinitionTreeState(): Thenable<DefinitionTreeState> {
	return vscode.commands.executeCommand<DefinitionTreeState>('mentor.e2e.getDefinitionTreeState');
}

/**
 * Opens a document of the fixture workspace and waits until it is the active document context.
 * @param file A workspace relative path of a document.
 * @returns The editor showing the document.
 */
async function openDocument(file: string): Promise<vscode.TextEditor> {
	const files = await vscode.workspace.findFiles(file);

	assert.strictEqual(files.length, 1, `the fixture workspace must contain ${file}`);

	const document = await vscode.workspace.openTextDocument(files[0]);
	const editor = await vscode.window.showTextDocument(document);

	await waitFor(async () => (await getDefinitionTreeState()).activeContext === document.uri.toString(), {
		label: `the document context of ${file}`
	});

	return editor;
}

/**
 * Moves the cursor onto the local name of the first occurrence of a token and waits until the
 * definition tree selects the node of the given resource.
 * @param editor An editor showing a document of the fixture workspace.
 * @param token The text to select, starting with the prefix of the resource.
 * @param iri The IRI of the resource that is expected to be selected.
 * @returns The selected node ids, empty if the tree did not select the resource in time.
 */
async function revealFromEditor(editor: vscode.TextEditor, token: string, iri: string): Promise<string[]> {
	const offset = editor.document.getText().indexOf(token);

	assert.ok(offset >= 0, `the document must contain ${token}`);

	const position = editor.document.positionAt(offset + 3);

	editor.selection = new vscode.Selection(position, position);

	const state = await waitFor<DefinitionTreeState | undefined>(async () => {
		const current = await getDefinitionTreeState();

		return current.selection.some(id => id.endsWith(`<${iri}>`)) ? current : undefined;
	}, { label: `the definition tree to select ${iri}`, timeoutMs: 10000 }).catch(() => undefined);

	return state?.selection ?? [];
}

/**
 * Revealing resources from the editor selection in a real extension host, on a workspace that
 * keeps its data files and its ontology in separate folders (faubulous/mentor-vscode#90).
 */
suite('definition tree reveal', () => {
	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();

		await vscode.commands.executeCommand('mentor.view.definitionTree.focus');

		await waitFor(async () => (await getDefinitionTreeState()).visible, { label: 'the definition tree to become visible' });
	});

	test('selects a predicate that the data document only uses', async () => {
		const editor = await openDocument('data/people-teams.ttl');
		const iri = 'http://example.org/org#fullName';

		// The predicate is defined in another document, so it is a referenced property here. It
		// was missing from the tree entirely before the reasoner inferred properties from usage.
		const selection = await revealFromEditor(editor, ':fullName "Alice', iri);

		assert.ok(selection.some(id => id.endsWith(`<${iri}>`)), `the tree selected ${JSON.stringify(selection)}`);
	});

	test('selects a sub property that the ontology document defines', async () => {
		const editor = await openDocument('ontologies/ontology.ttl');
		const iri = 'http://example.org/org#leads';

		// Nested below its super property, which means the tree must expand two levels that have
		// never been rendered before.
		const selection = await revealFromEditor(editor, ':leads a owl:ObjectProperty', iri);

		assert.ok(selection.some(id => id.endsWith(`<${iri}>`)), `the tree selected ${JSON.stringify(selection)}`);
	});

	test('resolves the definition of a predicate in another folder', async () => {
		const editor = await openDocument('data/people-teams.ttl');
		const offset = editor.document.getText().indexOf(':fullName "Alice');
		const position = editor.document.positionAt(offset + 3);

		const locations = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeDefinitionProvider', editor.document.uri, position);

		assert.strictEqual(locations.length, 1, 'the predicate must have exactly one definition');
		assert.ok(locations[0].uri.path.endsWith('/ontologies/ontology.ttl'), `the definition is in ${locations[0].uri.path}`);
	});
});
