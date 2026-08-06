import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from './helpers';

const MISSING_GRAPH = 'urn:e2e:missing';

/**
 * Regression test for the stale FROM-graph lint: changing a notebook's
 * connection must recompute the "Graph <…> not found" warnings against the
 * new connection — with the real notebook model and real event ordering.
 */
suite('notebook FROM-graph linting', () => {
	let cellUri: vscode.Uri;
	let notebookUri: vscode.Uri;

	function graphWarnings(): vscode.Diagnostic[] {
		return vscode.languages
			.getDiagnostics(cellUri)
			.filter(diagnostic => diagnostic.message.includes('not found in the connected store'));
	}

	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();

		const workspaceFolder = vscode.workspace.workspaceFolders![0];
		notebookUri = vscode.Uri.joinPath(workspaceFolder.uri, 'notebook.mnb');

		const notebook = await vscode.workspace.openNotebookDocument(notebookUri);
		await vscode.window.showNotebookDocument(notebook);

		const cell = notebook.getCells().find(c => c.document.languageId === 'sparql');
		assert.ok(cell, 'the fixture notebook must contain a SPARQL cell');
		cellUri = cell.document.uri;
	});

	test('flags a graph missing from the workspace store', async () => {
		// The cell defaults to the workspace connection, which does not contain
		// the referenced graph.
		const warnings = await waitFor(() => {
			const current = graphWarnings();
			return current.length > 0 ? current : undefined;
		}, { label: 'the missing-graph warning' });

		assert.ok(warnings![0].message.includes(MISSING_GRAPH));
	});

	test('clears the warnings when the notebook is switched to another connection', async () => {
		// The dummy connection has no graph list (no autoLoadGraphs): the linter
		// must withdraw its warnings rather than keep the stale workspace ones.
		await vscode.commands.executeCommand('mentor.e2e.setNotebookConnection', notebookUri.toString(), 'e2e-dummy');

		await waitFor(() => graphWarnings().length === 0, {
			label: 'the warnings to clear after switching to the dummy connection',
		});
	});

	test('restores the warnings when the notebook is switched back to the workspace', async () => {
		await vscode.commands.executeCommand('mentor.e2e.setNotebookConnection', notebookUri.toString(), 'workspace');

		await waitFor(() => graphWarnings().length > 0, {
			label: 'the warnings to return after switching back to the workspace store',
		});
	});
});
