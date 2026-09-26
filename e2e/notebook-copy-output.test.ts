import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from './helpers';

const SPARQL_RESULTS_MIME = 'application/sparql-results+json';

/**
 * The built-in 'Copy Cell Output' command serializes the first output item whose mime type it
 * knows, so a results cell must carry a plain text item next to the custom renderer mime
 * (faubulous/mentor-vscode#89). Verified against the real notebook model in an extension host.
 */
suite('notebook cell output items', () => {
	let notebook: vscode.NotebookDocument;

	/**
	 * Returns the output items of the notebook's first SPARQL cell, once it has been executed.
	 */
	async function executeQueryCell(): Promise<readonly vscode.NotebookCellOutputItem[]> {
		const cell = notebook.getCells().find(c => c.document.languageId === 'sparql');

		assert.ok(cell, 'the fixture notebook must contain a SPARQL cell');

		await vscode.commands.executeCommand('notebook.cell.execute', {
			ranges: [{ start: cell.index, end: cell.index + 1 }],
			document: notebook.uri
		});

		const outputs = await waitFor<readonly vscode.NotebookCellOutput[] | undefined>(() => {
			const current = notebook.cellAt(cell.index).outputs;

			return current.length > 0 ? current : undefined;
		}, { label: 'the cell to produce an output', timeoutMs: 30000 });

		return outputs![0].items;
	}

	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();

		const workspaceFolder = vscode.workspace.workspaceFolders![0];

		notebook = await vscode.workspace.openNotebookDocument(vscode.Uri.joinPath(workspaceFolder.uri, 'notebook.mnb'));

		await vscode.window.showNotebookDocument(notebook);
	});

	test('keeps the results renderer mime as the first output item', async () => {
		const items = await executeQueryCell();

		assert.strictEqual(items[0].mime, SPARQL_RESULTS_MIME,
			`the first item is ${items.map(i => i.mime).join(', ')}`);
	});

	test('adds a plain text item the built-in copy command can serialize', async () => {
		const items = await executeQueryCell();
		const copyable = items.find(item => item.mime === 'text/plain');

		assert.ok(copyable, `no text/plain item among ${items.map(i => i.mime).join(', ')}`);

		// The default copy format is CSV, whose header row quotes every column name.
		const text = new TextDecoder().decode(copyable.data);

		assert.ok(text.startsWith('"'), `the copied text is ${JSON.stringify(text.slice(0, 40))}`);
	});
});
