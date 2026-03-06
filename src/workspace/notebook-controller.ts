import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlQueryService } from '@src/services/interfaces';
import { QuadsResult } from '@src/services/shared/sparql-query-state';

export const NOTEBOOK_TYPE = 'mentor-notebook';

export class NotebookController implements vscode.Disposable {
	private readonly _id = 'mentor-notebook-controller';

	private readonly _label = 'Mentor Notebook';

	private readonly _supportedLanguages = ['sparql', 'turtle', 'trig', 'ntriples', 'nquads', 'xml'];

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

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(this);
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

		// We need a cancellation token source so we can request cancellation
		// from anywhere in Mentor. The execution.token is only cancelled when
		// the user explicitly cancels the cell execution in the notebook.
		const tokenSource = new vscode.CancellationTokenSource();

		execution.token.onCancellationRequested(() => {
			tokenSource.cancel();
		});

		try {
			const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
			let queryState = queryService.createQueryFromDocument(cell);

			queryState = await queryService.executeQuery(queryState, tokenSource);

			if (queryState.queryType === 'bindings' || queryState.queryType === 'boolean') {
				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.json(queryState, 'application/sparql-results+json')
				])]);
			} else if (queryState.queryType === 'quads') {
				const result = queryState.result as QuadsResult;

				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(result?.document, 'text/turtle')
				])]);
			}

			execution.end(true, Date.now());
		} catch (error: any) {
			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);

			execution.end(false, Date.now());
		}
	}
}
