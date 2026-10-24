import { useCallback, useEffect, useRef } from 'react';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { WebviewMessaging } from '@src/views/webviews/webview-messaging';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';
import { isRestorableQueryState } from './sparql-results-panel-state';

/**
 * Whether a tab's query lacks the outcome it needs to be displayed. The saved panel state
 * strips results and errors, so tabs restored from it have neither.
 * @param query The tab's query.
 * @returns `true` if the query can be restored and has neither a result nor an error.
 */
function needsRestore(query: SparqlQueryExecutionState | undefined): query is SparqlQueryExecutionState {
	return !!query && !!query.documentIri && !query.error && !query.result;
}

/**
 * Re-runs a query against its endpoint. Used only when the host no longer holds its result.
 * @param messaging The messaging instance of the panel.
 * @param query The query to execute.
 */
function executeQuery(messaging: WebviewMessaging<SparqlResultsWebviewMessages>, query: SparqlQueryExecutionState) {
	messaging.postMessage({
		id: 'ExecuteCommand',
		command: 'mentor.command.executeSparqlQuery',
		args: [{
			documentIri: query.documentIri,
			workspaceIri: query.workspaceIri,
			notebookIri: query.notebookIri,
			cellIndex: query.cellIndex,
			query: query.query,
		}]
	});
}

/**
 * Restores the results of panel tabs whose results were stripped from the saved webview state,
 * e.g. after the view was torn down while hidden. The result is first requested from the host's
 * query history by query id; the query is re-executed only when the host no longer holds it.
 * @param messaging The messaging instance of the panel.
 * @param activeQueries The queries currently shown as tabs.
 * @param onRestore Applies a cached execution state to its tab. Must be a stable callback.
 * @returns A function that restores the results of a tab's query, if it has none.
 */
export function useSparqlResultsRestore(
	messaging: WebviewMessaging<SparqlResultsWebviewMessages> | undefined,
	activeQueries: SparqlQueryExecutionState[],
	onRestore: (queryState: SparqlQueryExecutionState) => void
) {
	// The reply arrives asynchronously; read the tabs as they are then, not as they were
	// when the request was sent, so a tab closed or refreshed in the meantime is left alone.
	const activeQueriesRef = useRef(activeQueries);

	useEffect(() => {
		activeQueriesRef.current = activeQueries;
	}, [activeQueries]);

	useEffect(() => {
		if (!messaging) {
			return;
		}

		return messaging.onMessage(message => {
			if (message.id !== 'PostSparqlQueryResult') {
				return;
			}

			const query = activeQueriesRef.current.find(q => q.id === message.queryId);

			if (!needsRestore(query)) {
				return;
			}

			if (isRestorableQueryState(query, message.queryState)) {
				onRestore(message.queryState);
			} else {
				executeQuery(messaging, query);
			}
		});
	}, [messaging, onRestore]);

	return useCallback((query?: SparqlQueryExecutionState) => {
		if (needsRestore(query)) {
			messaging?.postMessage({ id: 'GetSparqlQueryResult', queryId: query.id });
		}
	}, [messaging]);
}
