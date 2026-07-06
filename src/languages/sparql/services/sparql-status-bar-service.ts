import * as vscode from 'vscode';
import { ISparqlConnectionRegistry, ISparqlEndpointTester, ISparqlQueryService, IGraphManagementService } from '@src/languages/sparql/services';
import { getDisplayName } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

/**
 * Owns a single, permanently visible SPARQL status bar item that opens the SPARQL
 * results panel when clicked. Its label reflects all current activity at once —
 * query execution / connection testing and named-graph loading are composed into one
 * label — and reverts to a summary of the configured connections and loaded graphs
 * when nothing is in progress.
 */
export class SparqlStatusBarService implements vscode.Disposable {

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
	 * Currently in-flight graph loads, keyed by connection ID, in start order.
	 * Graph loads can run concurrently (e.g. multiple connections auto-loading
	 * at once), so this map — rather than a single connection — tracks all of
	 * them; the oldest still-active entry is shown as the "current" one.
	 */
	private readonly _activeGraphLoads = new Map<string, SparqlConnection>();

	/**
	 * Total number of graph loads in the current batch, used to show progress
	 * like "Loading graphs 2 of 5: https://example.org/sparql"
	 */
	private _totalGraphLoads = 0;

	constructor(
		queryService: ISparqlQueryService,
		endpointTester: ISparqlEndpointTester,
		private readonly _graphService: IGraphManagementService,
		private readonly _connectionRegistry: ISparqlConnectionRegistry
	) {
		this._statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			this._priority
		);

		this._statusBarItem.command = 'mentor.view.sparqlResultsView.focus';
		this._statusBarItem.tooltip = 'Show SPARQL Panel';
		this._render();

		const graphService = this._graphService;

		this._subscriptions.push(
			this._connectionRegistry.onDidChangeConnections(() => this._render()),
			graphService.onDidChangeGraphs(() => this._render()),
			queryService.onDidQueryExecutionStart(state => {
				this._activitySegment = `$(sync~spin) Executing: ${getDisplayName(state)}`;
				this._render();
			}),
			queryService.onDidQueryExecutionEnd(() => {
				this._activitySegment = undefined;
				this._render();
			}),
			endpointTester.onDidConnectionTestStart(connection => {
				this._activitySegment = `$(sync~spin) Testing: ${connection.endpointUrl}`;
				this._render();
			}),
			endpointTester.onDidConnectionTestEnd(() => {
				this._activitySegment = undefined;
				this._render();
			}),
			graphService.onDidGraphLoadStart(connection => {
				if (this._activeGraphLoads.size === 0) {
					// First load of this batch — count total from scratch.
					this._totalGraphLoads = 1;
				} else {
					this._totalGraphLoads++;
				}
				this._activeGraphLoads.set(connection.id, connection);
				this._render();
			}),
			graphService.onDidGraphLoadEnd(connection => {
				this._activeGraphLoads.delete(connection.id);

				if (this._activeGraphLoads.size === 0) {
					this._totalGraphLoads = 0;
				}
				this._render();
			})
		);
	}

	/**
	 * Composes the item text from all active states and keeps it visible. Falls back
	 * to a summary of the configured connections and loaded graphs when nothing is
	 * in progress.
	 */
	private _render(): void {
		const segments: string[] = [];

		if (this._activitySegment) {
			segments.push(this._activitySegment);
		}

		if (this._activeGraphLoads.size > 0) {
			// The oldest still-active load is shown as "current" — with concurrent
			// loads this is the one that has been in flight the longest.
			const current = this._activeGraphLoads.values().next().value!;
			const done = this._totalGraphLoads - this._activeGraphLoads.size;

			segments.push(`$(sync~spin) Loading graphs ${done + 1} of ${this._totalGraphLoads}: ${current.endpointUrl}`);
		}

		this._statusBarItem.text = segments.length > 0 ? segments.join(this._segmentSeparator) : this._getSummaryLabel();
		this._statusBarItem.show();
	}

	/**
	 * Builds the idle label summarizing the configured connections and the total
	 * number of loaded named graphs, in the same style as the workspace index item.
	 * @returns The summary label, e.g. `$(sparql-file) 2 connections; 12 graphs`.
	 */
	private _getSummaryLabel(): string {
		const connections = this._connectionRegistry.getConnections();

		let graphCount = 0;

		for (const connection of connections) {
			graphCount += this._graphService.getGraphsForConnection(connection.id, false).length;
		}

		const parts = [
			`${connections.length} connection${connections.length === 1 ? '' : 's'}`,
			`${graphCount} graph${graphCount === 1 ? '' : 's'}`,
		];

		return `$(sparql-file) ${parts.join('; ')}`;
	}

	dispose(): void {
		this._statusBarItem.dispose();

		for (const sub of this._subscriptions) {
			sub.dispose();
		}
	}
}
