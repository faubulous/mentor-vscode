import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';

/**
 * State for the SPARQL results panel component.
 */
export interface SparqlResultsPanelState {
	/**
	 * A key that forces a full re-render of the component when changed.
	 */
	renderKey: number;

	/**
	 * The list of active SPARQL queries with results to display in tabs.
	 */
	activeQueries: SparqlQueryExecutionState[];

	/**
	 * The index of the currently active tab. `0` indicates the welcome view.
	 */
	activeTabIndex: number;

	/**
	 * The id of a query whose tab should become active as soon as it exists. Set from a
	 * history message's `selectQueryId` and carried across messages until the matching tab
	 * is present, so selection is independent of whether the select-intent or the tab
	 * arrives first. `undefined` once satisfied or when no selection is pending.
	 */
	pendingSelectQueryId?: string;
}

/**
 * Whether a query's results are shown as a tab in the results panel. CONSTRUCT/DESCRIBE
 * (`quads`) open as a Turtle editor instead, and notebook-cell results render inline in
 * the cell — neither gets a panel tab.
 */
function shouldHandleQueryResults(queryState: SparqlQueryExecutionState): boolean {
	if (queryState.queryType === 'quads' || queryState.queryType === 'void') {
		return false;
	}

	if (queryState.notebookIri) {
		return false;
	}

	return true;
}

/**
 * Merges the most recent query from a `PostSparqlQueryHistory` message into the panel state
 * and applies the pending tab selection.
 *
 * Selection is decoupled from message timing: `selectQueryId` (the query the controller
 * wants brought to front) is remembered as {@link SparqlResultsPanelState.pendingSelectQueryId}
 * and applied the moment the matching query's tab is present — whether that happens in this
 * message or a later one. A message without a `selectQueryId` (a plain history refresh or a
 * query removal) never changes the active tab.
 *
 * @param state The current panel state.
 * @param history The query history from the message (most recent first).
 * @param selectQueryId The id of the query the controller wants selected, if any.
 * @returns The next panel state.
 */
export function reduceOnHistory(
	state: SparqlResultsPanelState,
	history: SparqlQueryExecutionState[],
	selectQueryId?: string
): SparqlResultsPanelState {
	// Carry the select-intent forward until it is satisfied.
	const desiredId = selectQueryId ?? state.pendingSelectQueryId;

	const query = history[0];

	if (!query || !shouldHandleQueryResults(query)) {
		// No tab to add/update, but keep the (possibly new) intent so a later message selects it.
		return state.pendingSelectQueryId === desiredId ? state : { ...state, pendingSelectQueryId: desiredId };
	}

	// For background queries also match tabs that carry label+connectionId but lost the
	// background flag because they were replaced by a doc execution (Edit → run from the
	// untitled doc).
	const n = query.isBackground
		? state.activeQueries.findIndex(q => q.label === query.label && q.connectionId === query.connectionId)
		: state.activeQueries.findIndex(q => q.documentIri === query.documentIri);

	const activeQueries = [...state.activeQueries];
	let activeQueryIndex = n;

	if (n >= 0) {
		const existingTab = activeQueries[n];

		// When a background-query tab is replaced by a doc execution, carry over the routing
		// metadata (id, label, connectionId, connectionName) so the tab can still be matched
		// and reload can fall back to the background path after the document is closed.
		//
		// IMPORTANT: test for the presence of label+connectionId rather than
		// existingTab.isBackground===true because history is logged TWICE per execution
		// (start + end); the first fire clears the background flag on the stored entry, and
		// the second would then skip the merge and lose the metadata.
		const existingHasBgMetadata = !!(existingTab.label && existingTab.connectionId);

		const mergedQuery =
			!query.isBackground && existingHasBgMetadata
				? {
						...query,
						id: existingTab.id,
						label: existingTab.label,
						connectionId: query.connectionId ?? existingTab.connectionId,
						connectionName: existingTab.connectionName,
					}
				: query;

		activeQueries.splice(n, 1, mergedQuery);
		activeQueryIndex = n;
	} else {
		activeQueries.push(query);
		activeQueryIndex = activeQueries.length - 1;
	}

	let activeTabIndex = state.activeTabIndex;
	let pendingSelectQueryId = desiredId;

	// This message carries the query we want to select (matched by the incoming id, which
	// is stable even when the merge above rewrites the stored tab's id) — activate its tab.
	if (desiredId !== undefined && query.id === desiredId) {
		activeTabIndex = activeQueryIndex + 1;
		pendingSelectQueryId = undefined;
	}

	return {
		...state,
		renderKey: (state.renderKey || 0) + 1,
		activeQueries,
		activeTabIndex,
		pendingSelectQueryId,
	};
}

/**
 * Forces the welcome tab and drops any pending selection. Used when the panel is opened as a
 * hub (e.g. from the status bar) rather than to reveal a specific query's results.
 */
export function reduceOnShowWelcome(state: SparqlResultsPanelState): SparqlResultsPanelState {
	return { ...state, activeTabIndex: 0, pendingSelectQueryId: undefined };
}

/**
 * Whether the execution state the host cached for a query can restore that query's tab
 * without re-running it. The cached entry must be the same execution (same id and document)
 * and must either hold an outcome (a result or an error) or still be executing, in which case
 * the history post at its end fills in the result.
 * @param query The tab's query, whose result was stripped from the saved panel state.
 * @param cachedState The state the host returned for the query's id, if any.
 * @returns `true` if the cached state can be shown instead of re-executing the query.
 */
export function isRestorableQueryState(
	query: SparqlQueryExecutionState,
	cachedState?: SparqlQueryExecutionState
): cachedState is SparqlQueryExecutionState {
	if (!cachedState || cachedState.id !== query.id || cachedState.documentIri !== query.documentIri) {
		return false;
	}

	const isExecuting = cachedState.endTime === undefined;

	return cachedState.result !== undefined || cachedState.error !== undefined || isExecuting;
}

/**
 * Applies the execution state the host cached for a query to that query's tab. Only the
 * execution outcome is taken over; the tab keeps its routing metadata (label, connection,
 * document IRI) because the panel may have updated it since the query ran.
 * @param state The current panel state.
 * @param cachedState The cached execution state of one of the panel's queries.
 * @returns The next panel state, or the current state when the query's tab was closed.
 */
export function reduceOnQueryResult(
	state: SparqlResultsPanelState,
	cachedState: SparqlQueryExecutionState
): SparqlResultsPanelState {
	const index = state.activeQueries.findIndex(q => q.id === cachedState.id);

	if (index < 0) {
		return state;
	}

	const activeQueries = [...state.activeQueries];

	activeQueries[index] = {
		...activeQueries[index],
		queryType: cachedState.queryType,
		startTime: cachedState.startTime,
		endTime: cachedState.endTime,
		result: cachedState.result,
		error: cachedState.error
	};

	return { ...state, activeQueries };
}
