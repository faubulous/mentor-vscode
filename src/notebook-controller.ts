import * as vscode from 'vscode';
import { mentor } from './mentor';
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite';

export const NOTEBOOK_TYPE = 'mentor-notebook';

export class NotebookController {
	private readonly _id = 'mentor-notebook-controller';

	private readonly _label = 'Mentor Notebook';

	private readonly _supportedLanguages = ['sparql'];

	private readonly _controller: vscode.NotebookController;

	private _executionOrder = 0;

	constructor() {
		this._controller = vscode.notebooks.createNotebookController(this._id, NOTEBOOK_TYPE, this._label);
		this._controller.executeHandler = this._executeAll.bind(this);
		this._controller.supportedLanguages = this._supportedLanguages;
		this._controller.supportsExecutionOrder = true;
	}

	dispose(): void {
		this._controller.dispose();
	}

	private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
		for (const cell of cells) {
			this._doExecution(cell);
		}
	}

	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
		this._executeSparqlQuery(cell);
	}

	private generateCSV(bindings: any[]): string {
		const headers: Set<string> = new Set();
		const rows: string[][] = [];

		// Process each binding entry
		for (const b of bindings) {
			const row: string[] = [];
			const map = b.entries as Map<string, { value: string }>;

			for (const entry of map.entries()) {
				headers.add(entry[0]);
				row.push(entry[1].value);
			}

			rows.push(row);
		}

		const csv = [
			Array.from(headers).join(','),
			...rows.map(row => row.join(','))
		].join('\n');

		return csv;
	}

	private async _executeSparqlQuery(cell: vscode.NotebookCell) {
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		try {
			const query = cell.document.getText();

			const source = mentor.store;
			const queryEngine = new QueryEngine();

			const bindings = await queryEngine.queryBindings(query, {
				sources: [source],
				unionDefaultGraph: true
			});

			const results = await bindings.toArray();

			execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(JSON.stringify(results), 'application/json')
			])]);
		} catch (error: any) {
			execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);
		}

		execution.end(true, Date.now());
	}
}
