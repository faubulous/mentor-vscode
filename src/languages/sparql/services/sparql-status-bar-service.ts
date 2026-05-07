import * as vscode from 'vscode';
import { ISparqlConnectionService, ISparqlQueryService } from '@src/languages/sparql/services';
import { getDisplayName } from '@src/languages/sparql/services/sparql-query-state';

/**
 * Displays a transient status bar item while a SPARQL connection is being tested
 * or a SPARQL query is being executed. The item disappears immediately when the
 * activity completes.
 */
export class SparqlStatusBarService implements vscode.Disposable {
	private readonly _statusBarItem: vscode.StatusBarItem;

	private readonly _subscriptions: vscode.Disposable[] = [];

	constructor(
		queryService: ISparqlQueryService,
		connectionService: ISparqlConnectionService
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
			})
		);
	}

	dispose(): void {
		this._statusBarItem.dispose();

		for (const sub of this._subscriptions) {
			sub.dispose();
		}
	}
}
