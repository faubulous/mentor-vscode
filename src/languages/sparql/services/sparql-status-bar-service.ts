import * as vscode from 'vscode';
import { ISparqlConnectionService, ISparqlQueryService, IGraphManagementService } from '@src/languages/sparql/services';
import { getDisplayName } from '@src/languages/sparql/services/sparql-query-state';

/**
 * Owns a single, permanently visible SPARQL status bar item that opens the SPARQL
 * results panel when clicked. Its label reflects all current activity at once —
 * query execution / connection testing and named-graph loading are composed into one
 * label — and reverts to "SPARQL" when nothing is in progress.
 */
export class SparqlStatusBarService implements vscode.Disposable {
	/**
	 * The label shown on the SPARQL status bar item when no activity is in progress.
	 */
	private readonly _defaultLabel = '$(sparql-file) SPARQL';

	/** 
	 * Separator between activity segments when several are active at once.
	 */
	private readonly _segmentSeparator = ' · ';

	/**
	 * Status bar priority. The low value keeps the item at the far right of the
	 * left-aligned status bar — after built-in items such as "Auto Attach"
	 * (priority 0) — so it stays with the other Mentor items.
	 */
	private readonly _priority = -10002;

	/**
	 * The status bar item owned by this service. It is created once and kept alive 
	 * for the entire extension lifetime, and its label is updated to reflect the 
	 * current state of SPARQL-related activity.
	 */
	private readonly _statusBarItem: vscode.StatusBarItem;

	/**
	 * Subscriptions being disposed of when this service is disposed.
	 */
	private readonly _subscriptions: vscode.Disposable[] = [];

	/**
	 * The current query-execution / connection-test segment, if any.
	 */
	private _activitySegment: string | undefined;

	/**
	 * Number of currently active graph loads.
	 */
	private _activeGraphLoads = 0;

	/**
	 * Total number of graph loads in the current batch, used to show progress 
	 * like "Loading graphs: 2 of 5 connections..."
	 */
	private _totalGraphLoads = 0;

	constructor(
		queryService: ISparqlQueryService,
		connectionService: ISparqlConnectionService,
		graphService: IGraphManagementService
	) {
		this._statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			this._priority
		);

		this._statusBarItem.command = 'mentor.view.sparqlResultsView.focus';
		this._statusBarItem.tooltip = 'Show SPARQL Panel';
		this._render();

		this._subscriptions.push(
			queryService.onDidQueryExecutionStart(state => {
				this._activitySegment = `$(sync~spin) Executing: ${getDisplayName(state)}`;
				this._render();
			}),
			queryService.onDidQueryExecutionEnd(() => {
				this._activitySegment = undefined;
				this._render();
			}),
			connectionService.onDidConnectionTestStart(connection => {
				this._activitySegment = `$(sync~spin) Testing: ${connection.endpointUrl}`;
				this._render();
			}),
			connectionService.onDidConnectionTestEnd(() => {
				this._activitySegment = undefined;
				this._render();
			}),
			graphService.onDidGraphLoadStart(() => {
				if (this._activeGraphLoads === 0) {
					// First load of this batch — count total from scratch.
					this._totalGraphLoads = 1;
				} else {
					this._totalGraphLoads++;
				}
				this._activeGraphLoads++;
				this._render();
			}),
			graphService.onDidGraphLoadEnd(() => {
				this._activeGraphLoads = Math.max(0, this._activeGraphLoads - 1);

				if (this._activeGraphLoads === 0) {
					this._totalGraphLoads = 0;
				}
				this._render();
			})
		);
	}

	/**
	 * Composes the item text from all active states and keeps it visible. Falls back
	 * to the default "SPARQL" label when nothing is in progress.
	 */
	private _render(): void {
		const segments: string[] = [];

		if (this._activitySegment) {
			segments.push(this._activitySegment);
		}

		if (this._activeGraphLoads > 0) {
			const done = this._totalGraphLoads - this._activeGraphLoads;
			segments.push(`$(sync~spin) Loading graphs: ${done} of ${this._totalGraphLoads} connections..`);
		}

		this._statusBarItem.text = segments.length > 0 ? segments.join(this._segmentSeparator) : this._defaultLabel;
		this._statusBarItem.show();
	}

	dispose(): void {
		this._statusBarItem.dispose();

		for (const sub of this._subscriptions) {
			sub.dispose();
		}
	}
}
