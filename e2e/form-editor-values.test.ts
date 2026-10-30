import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor } from './helpers';

/**
 * The namespace of the fixture documents of these tests.
 */
const NS = 'http://example.org/values#';

/**
 * The fixture documents of these tests, which no other suite opens.
 */
const DOCUMENTS = ['data/form-values.ttl', 'data/form-values.nt', 'data/form-values.nq'];

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
 * Set the values of `ex:p` of `ex:s` through the form editor of a document: the value written
 * as `"a"` stays, and the literal `"b"` is added after it.
 * @param document The document.
 * @returns How the edit ended.
 */
function keepAndAdd(document: vscode.TextDocument): Thenable<EditOutcomeView> {
	return vscode.commands.executeCommand<EditOutcomeView>('mentor.e2e.applyFormEditorEdit', document.uri.toString(), [{
		op: 'setValues',
		subject: { kind: 'iri', iri: `${NS}s` },
		predicate: `${NS}p`,
		values: [
			{ kind: 'existing', anchor: document.getText().indexOf('"a"') },
			{ kind: 'term', term: { kind: 'literal', value: 'b' } }
		]
	}]);
}

/**
 * Verifies that the values of a statement edited in the form are written in the syntax of the
 * document by a real extension host: as a list of objects in Turtle, and as one line per value
 * with the subject and the graph of its neighbour in N-Triples and N-Quads.
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
});
