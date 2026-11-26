import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor } from './helpers';

/**
 * The parts of the snapshot these tests read.
 */
interface SnapshotView {
	resources: { label: string; prefixedName?: string; propertyCount: number; iconName: string; inferredTypeLabels?: string[] }[];
	documentResource?: { termType: string; value: string };
	namespaces: { prefix: string }[];
	readOnly?: unknown;
}

/**
 * Verifies that the data the form editor renders is produced for a real document in a real
 * extension host: the snapshot is built from the document context, which only exists once the
 * document has been loaded and tokenized, and reaches the editor through its session.
 */
suite('form editor content', () => {
	suiteSetup(async () => {
		await activateMentor();
	});

	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('builds a snapshot with the ontology and the defined terms', async () => {
		const [uri] = await vscode.workspace.findFiles('data/ontology.ttl', undefined, 1);

		const snapshot = await openSnapshot(uri);

		assert.ok(snapshot, 'the snapshot must be built');
		assert.strictEqual(snapshot.readOnly, undefined, 'a valid fixture must not be read-only');
		assert.strictEqual(snapshot.documentResource?.value, 'http://example.org/e2e#', 'the fixture declares an owl:Ontology, which heads the document');

		const labels = snapshot.resources.map(resource => resource.label);

		assert.ok(labels.includes('Thing'), `the class must appear in the resource list, got ${JSON.stringify(labels)}`);
		assert.ok(labels.includes('name'), 'the property must appear in the resource list');
		assert.ok(snapshot.resources.some(resource => resource.iconName === 'mentor-rdf-class'), 'the class must carry the class glyph');
		assert.ok(snapshot.namespaces.some(namespace => namespace.prefix === 'ex'), 'the declared namespaces must be reported');
	});

	test('names the types the reasoner infers for a resource', async () => {
		const [uri] = await vscode.workspace.findFiles('data/ontology.ttl', undefined, 1);
		const snapshot = await openSnapshot(uri);
		const thing = snapshot.resources.find(resource => resource.label === 'Thing');

		assert.ok(thing, 'the class must appear in the resource list');
		assert.ok(thing.inferredTypeLabels?.some(label => /class/i.test(label)), `the reasoner infers rdfs:Class for an owl:Class, got ${JSON.stringify(thing.inferredTypeLabels)}`);
	});
});

/**
 * Open the form editor on a document and wait for its snapshot.
 * @param uri The document.
 * @returns The snapshot.
 */
async function openSnapshot(uri: vscode.Uri): Promise<SnapshotView> {
	await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);

	const snapshot = await waitFor(async () => {
		const result = await vscode.commands.executeCommand<SnapshotView | undefined>('mentor.e2e.getFormEditorSnapshot', uri.toString());

		return result?.resources.length ? result : undefined;
	}, { label: 'the form editor snapshot to be built' });

	assert.ok(snapshot, 'the snapshot must be built');

	return snapshot;
}
