import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { QuadsResult } from '@/services/sparql-query-state';

export const NOTEBOOK_TYPE = 'mentor-notebook';

export class NotebookController {
	private readonly _id = 'mentor-notebook-controller';

	private readonly _label = 'Mentor Notebook';

	private readonly _supportedLanguages = ['sparql'];

	private readonly _controller: vscode.NotebookController;

	private readonly _messaging: vscode.NotebookRendererMessaging;

	private readonly _subscriptions: vscode.Disposable[] = [];

	private _executionOrder = 0;

	constructor() {
		this._controller = vscode.notebooks.createNotebookController(this._id, NOTEBOOK_TYPE, this._label);
		this._controller.executeHandler = this._executeAll.bind(this);
		this._controller.supportedLanguages = this._supportedLanguages;
		this._controller.supportsExecutionOrder = true;

		this._subscriptions.push(this._controller);

		this._messaging = vscode.notebooks.createRendererMessaging('mentor.notebook.sparqlResultsRenderer');
		this._messaging.onDidReceiveMessage(this._onDidReceiveMessage, this, this._subscriptions);
	}

	dispose(): void {
		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}
	}

	private _onDidReceiveMessage(e: any) {
		const message = e.message;

		if (message.id === 'ExecuteCommand') {
			vscode.commands.executeCommand(message.command, ...message.args);
		}
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
			let queryState = mentor.sparqlQueryService.createQuery(cell);

			queryState = await mentor.sparqlQueryService.executeQuery(queryState);

			if (queryState.queryType === 'bindings' || queryState.queryType === 'boolean') {
				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.json(queryState, 'application/sparql-results+json')
				])]);

				execution.end(true, Date.now());
			} else if (queryState.queryType === 'quads') {
				const result = queryState.result as QuadsResult;

				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(result?.document, 'text/x-turtle')
				])]);

				execution.end(true, Date.now());
			} else {
				const message = `Unknown or unsupported result type: ${queryState.queryType}`;

				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(message, 'text/plain')
				])]);

				execution.end(false, Date.now());
			}
		} catch (error: any) {
			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);

			execution.end(false, Date.now());
		}
	}
}
