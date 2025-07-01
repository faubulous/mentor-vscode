import * as vscode from 'vscode';
import { mentor } from './mentor';

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

	private async _executeSparqlQuery(cell: vscode.NotebookCell) {
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		try {
			const documentIri = cell.notebook.uri.toString();
			const query = cell.document.getText();

			const results = await mentor.sparqlQueryService.executeQuery(query, documentIri);

			execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.json(results, 'application/sparql-results+json')
			])]);
		} catch (error: any) {
			execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);
		}

		execution.end(true, Date.now());
	}
}
