import * as assert from 'assert';
import * as vscode from 'vscode';
import { DataFactory } from 'rdf-data-factory';
import { activateMentor, waitFor } from './helpers';

/**
 * The namespace of the fixture documents of these tests.
 */
const NS = 'http://example.org/values#';

/**
 * Creates the RDF/JS terms of the edits.
 */
const factory = new DataFactory();

/**
 * The fixture documents of these tests, which no other suite opens.
 */
const DOCUMENTS = ['data/form-values.ttl', 'data/form-values.nt', 'data/form-values.nq', 'data/form-label-rule.ttl'];

/**
 * What the edit hook reports.
 */
interface EditOutcomeView {
	ok: boolean;
	message?: string;
}

/**
 * Open a fixture in the form editor and wait until its snapshot is built.
 * @param path The path of the fixture in the workspace.
 * @returns The document.
 */
async function openInFormEditor(path: string): Promise<vscode.TextDocument> {
	const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, path);

	await vscode.commands.executeCommand('mentor.command.openFormEditor', uri);
	await waitFor(async () => {
		const snapshot = await vscode.commands.executeCommand<{ resources: unknown[] } | undefined>('mentor.e2e.getFormEditorSnapshot', uri.toString());

		return (snapshot?.resources.length ?? 0) > 0;
	}, { label: `the form editor snapshot of ${path}` });

	return vscode.workspace.openTextDocument(uri);
}

/**
 * Wait until the form editor of a document shows its current version, as an edit is built from it.
 * @param document The document.
 */
async function waitForFormEditorVersion(document: vscode.TextDocument): Promise<void> {
	await waitFor(async () => {
		const snapshot = await vscode.commands.executeCommand<{ version: number } | undefined>('mentor.e2e.getFormEditorSnapshot', document.uri.toString());

		return snapshot?.version === document.version;
	}, { label: `the form editor snapshot of version ${document.version}` });
}

/**
 * Set the values of `ex:p` of `ex:s` through the form editor of a document: the value written
 * as `"a"` stays, and the literal `"b"` is added after it.
 * @param document The document.
 * @returns How the edit ended.
 */
function keepAndAdd(document: vscode.TextDocument): Thenable<EditOutcomeView> {
	return setValues(document, [
		{ kind: 'existing', anchor: document.getText().indexOf('"a"') },
		{ kind: 'term', term: factory.literal('b') }
	]);
}

/**
 * Set the values of `ex:p` of `ex:s` through the form editor of a document.
 * @param document The document.
 * @param values The values.
 * @returns How the edit ended.
 */
function setValues(document: vscode.TextDocument, values: unknown[]): Thenable<EditOutcomeView> {
	return vscode.commands.executeCommand<EditOutcomeView>('mentor.e2e.applyFormEditorEdit', document.uri.toString(), [{
		op: 'setValues',
		subject: factory.namedNode(`${NS}s`),
		predicate: `${NS}p`,
		values
	}]);
}

/**
 * Verifies that the values of a statement edited in the form are written in the syntax of the
 * document by a real extension host: as a list of objects in Turtle, and as one line per value
 * with the subject and the graph of its neighbour in N-Triples and N-Quads; a new nested node and
 * a copy of one in Turtle; a resource renamed from its card, and a class renamed with its label.
 */
suite('form editor values', () => {
	suiteSetup(async () => {
		await activateMentor();
	});

	teardown(async () => {
		for (const path of DOCUMENTS) {
			const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, path);
			const document = vscode.workspace.textDocuments.find(candidate => candidate.uri.toString() === uri.toString());

			if (document?.isDirty) {
				await vscode.window.showTextDocument(document);
				await vscode.commands.executeCommand('workbench.action.files.revert');
			}
		}

		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('writes a new value into the list of objects of a Turtle statement', async () => {
		const document = await openInFormEditor('data/form-values.ttl');
		const outcome = await keepAndAdd(document);

		assert.ok(outcome.ok, `the edit must be applied, got ${JSON.stringify(outcome)}`);
		assert.strictEqual(document.getText(), '@prefix ex: <http://example.org/values#> .\n\nex:s ex:p "a", "b" .\n', 'ex:b goes, "a" stays and "b" follows it');
	});

	test('writes a new value as a line of its own in N-Triples', async () => {
		const document = await openInFormEditor('data/form-values.nt');
		const outcome = await keepAndAdd(document);

		assert.ok(outcome.ok, `the edit must be applied, got ${JSON.stringify(outcome)}`);
		assert.strictEqual(document.getText(), [
			`<${NS}s> <${NS}p> "a" .`,
			`<${NS}s> <${NS}p> "b" .`,
			`<${NS}s> <${NS}q> "x" .`,
			''
		].join('\n'));
	});

	test('keeps the graph of the neighbouring line in N-Quads', async () => {
		const document = await openInFormEditor('data/form-values.nq');
		const outcome = await keepAndAdd(document);

		assert.ok(outcome.ok, `the edit must be applied, got ${JSON.stringify(outcome)}`);
		assert.strictEqual(document.getText(), [
			`<${NS}s> <${NS}p> "a" <${NS}g> .`,
			`<${NS}s> <${NS}p> "b" <${NS}g> .`,
			''
		].join('\n'));
	});

	test('writes a new nested node, and a copy of it after it, in Turtle', async () => {
		const document = await openInFormEditor('data/form-values.ttl');
		const added = await setValues(document, [
			{ kind: 'existing', anchor: document.getText().indexOf('"a"') },
			{ kind: 'node', statements: [{ predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', values: [{ kind: 'term', term: factory.namedNode(`${NS}T`) }] }] }
		]);

		assert.ok(added.ok, `the node must be written, got ${JSON.stringify(added)}`);
		assert.strictEqual(document.getText(), '@prefix ex: <http://example.org/values#> .\n\nex:s ex:p "a", [ a ex:T ] .\n');

		await waitForFormEditorVersion(document);

		const node = document.getText().indexOf('[');
		const copied = await setValues(document, [
			{ kind: 'existing', anchor: document.getText().indexOf('"a"') },
			{ kind: 'existing', anchor: node },
			{ kind: 'copy', anchor: node }
		]);

		assert.ok(copied.ok, `the copy must be written, got ${JSON.stringify(copied)}`);
		assert.strictEqual(document.getText(), '@prefix ex: <http://example.org/values#> .\n\nex:s ex:p "a", [ a ex:T ], [ a ex:T ] .\n');
	});

	test('renames a resource from its card as F2 does', async () => {
		const document = await openInFormEditor('data/form-values.ttl');

		await vscode.commands.executeCommand('mentor.e2e.renameFormEditorResource', document.uri.toString(), `${NS}s`, 't');

		assert.strictEqual(document.getText(), '@prefix ex: <http://example.org/values#> .\n\nex:t ex:p "a", ex:b .\n');
	});

	test('renames a class whose IRI was made from its label when the label is edited, as the label rule does', async () => {
		const document = await openInFormEditor('data/form-label-rule.ttl');
		const outcome = await vscode.commands.executeCommand<EditOutcomeView>('mentor.e2e.applyFormEditorEdit', document.uri.toString(), [{
			op: 'setValues',
			subject: factory.namedNode('http://example.org/label-rule#AppleTree'),
			predicate: 'http://www.w3.org/2000/01/rdf-schema#label',
			values: [{ kind: 'term', term: factory.literal('Oak tree', 'en') }]
		}]);

		assert.ok(outcome.ok, `the edit must be applied, got ${JSON.stringify(outcome)}`);
		assert.ok(document.getText().includes('ex:OakTree a owl:Class ;\n    rdfs:label "Oak tree"@en .'), `the class must follow its label, got ${document.getText()}`);
	});
});
