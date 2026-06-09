import * as vscode from 'vscode';
import { ISparqlConnectionService, ISparqlQueryService, ISparqlGraphService } from '@src/languages/sparql/services';
import { getDisplayName } from '@src/languages/sparql/services/sparql-query-state';

/**
 * Displays a transient status bar item while a SPARQL connection is being tested,
 * a SPARQL query is being executed, or named graphs are being loaded from an endpoint.
 * The item disappears immediately when all activity completes.
 */
export class SparqlStatusBarService implements vscode.Disposable {
	private readonly _statusBarItem: vscode.StatusBarItem;

	private readonly _subscriptions: vscode.Disposable[] = [];

	private _activeGraphLoads = 0;

	private _totalGraphLoads = 0;

	constructor(
		queryService: ISparqlQueryService,
		connectionService: ISparqlConnectionService,
		graphService: ISparqlGraphService
	) {
		this._statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			-1
		);

		this._subscriptions.push(
			queryService.onDidQueryExecutionStart(state => {
				this._statusBarItem.text = `$(sync~spin) Executing: ${getDisplayName(state)}`;
				this._statusBarItem.show();
			}),
			queryService.onDidQueryExecutionEnd(() => {
				this._statusBarItem.hide();
			}),
			connectionService.onDidConnectionTestStart(connection => {
				this._statusBarItem.text = `$(sync~spin) Testing: ${connection.endpointUrl}`;
				this._statusBarItem.show();
			}),
			connectionService.onDidConnectionTestEnd(() => {
				this._statusBarItem.hide();
			}),
			graphService.onDidGraphLoadStart(() => {
				if (this._activeGraphLoads === 0) {
					// First load of this batch — count total from scratch.
					this._totalGraphLoads = this._activeGraphLoads + 1;
				} else {
					this._totalGraphLoads++;
				}
				this._activeGraphLoads++;
				this._updateGraphLoadText();
			}),
			graphService.onDidGraphLoadEnd(() => {
				this._activeGraphLoads = Math.max(0, this._activeGraphLoads - 1);

				if (this._activeGraphLoads === 0) {
					this._totalGraphLoads = 0;
					this._statusBarItem.hide();
				} else {
					this._updateGraphLoadText();
				}
			})
		);
	}

	private _updateGraphLoadText(): void {
		const done = this._totalGraphLoads - this._activeGraphLoads;
		this._statusBarItem.text = `$(sync~spin) Loading graphs: ${done} of ${this._totalGraphLoads} connections..`;
		this._statusBarItem.show();
	}

	dispose(): void {
		this._statusBarItem.dispose();

		for (const sub of this._subscriptions) {
			sub.dispose();
		}
	}
}
