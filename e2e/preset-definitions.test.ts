import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, countGraphTriples, getMentorState, waitFor, waitForIndexing } from './helpers';

const RDFS_GRAPH = 'http://www.w3.org/2000/01/rdf-schema#';

/**
 * Go to definition on a term of a framework vocabulary must open the read-only document
 * that shows the vocabulary source shipped with Mentor, without changing the vocabulary
 * graph in the store.
 */
suite('go to definition in the preset graphs', () => {
	let ontologyUri: vscode.Uri;

	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();

		const workspaceFolder = vscode.workspace.workspaceFolders![0];

		ontologyUri = vscode.Uri.joinPath(workspaceFolder.uri, 'data', 'ontology.ttl');

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(ontologyUri));
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	/**
	 * Requests the definition at a position of the ontology and returns its location.
	 * Until the opened document is parsed, the request may come back empty.
	 * @param position The position of the term.
	 */
	async function getDefinition(position: vscode.Position): Promise<vscode.Location> {
		const definitions = await waitFor(async () => {
			const result = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeDefinitionProvider', ontologyUri, position);

			return result?.length > 0 && result;
		}, { label: 'the definition', timeoutMs: 10000 }) as (vscode.Location | vscode.LocationLink)[];

		const definition = definitions[0];

		return definition instanceof vscode.Location ? definition : new vscode.Location(definition.targetUri, definition.targetRange);
	}

	/**
	 * Returns the text of a location.
	 * @param location The location.
	 */
	async function getText(location: vscode.Location): Promise<string> {
		const document = await vscode.workspace.openTextDocument(location.uri);

		return document.getText(location.range);
	}

	test('opens the RDFS vocabulary at the definition of rdfs:label', async () => {
		// `    rdfs:label "E2E fixture ontology"@en .` is on line 6; the cursor is inside `label`.
		const location = await getDefinition(new vscode.Position(5, 10));

		assert.strictEqual(location.uri.toString(), 'mentor-vfs:/vocabularies/rdfs.ttl');
		assert.strictEqual(await getText(location), 'rdfs:label');
	});

	test('opens the OWL vocabulary at the definition of owl:Class', async () => {
		// `ex:Thing a owl:Class ;` is on line 8; the cursor is inside `Class`.
		const location = await getDefinition(new vscode.Position(7, 16));

		assert.strictEqual(location.uri.toString(), 'mentor-vfs:/vocabularies/owl.ttl');
		assert.strictEqual(await getText(location), 'owl:Class');
	});

	test('shows the vocabularies in a read-only file system', () => {
		assert.strictEqual(vscode.workspace.fs.isWritableFileSystem('mentor-vfs'), false);
	});

	test('keeps the vocabulary graph when its document is opened and closed', async () => {
		const tripleCount = await countGraphTriples(RDFS_GRAPH);
		const rdfsUri = vscode.Uri.parse('mentor-vfs:/vocabularies/rdfs.ttl');

		assert.ok(tripleCount > 0, 'the RDFS vocabulary is loaded');

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(rdfsUri));
		await waitFor(async () => (await getMentorState()).documentContexts.includes(rdfsUri.toString()), { label: 'the vocabulary document context' });

		assert.strictEqual(await countGraphTriples(RDFS_GRAPH), tripleCount, 'opening the document does not change the graph');

		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

		assert.strictEqual(await countGraphTriples(RDFS_GRAPH), tripleCount, 'closing the document does not change the graph');

		const { storeGraphs } = await getMentorState();

		assert.ok(!storeGraphs.some(graph => graph.startsWith('mentor-vfs:')), 'the document does not add a graph of its own');
	});
});
