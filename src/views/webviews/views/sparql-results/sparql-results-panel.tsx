import { createRoot } from 'react-dom/client';
import { Fragment, useState, useEffect, useCallback } from 'react';
import { WebviewHost } from '@src/views/webviews/webview-host';
import { useWebviewMessaging, useStylesheet, useVscodeElementRef } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/shared/use-shared-stylesheets';
import { SparqlQueryExecutionState, getDisplayName } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlResultsView } from './components/sparql-results-view';
import { SparqlWelcomeView } from './components/sparql-welcome-view';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';
import { SparqlResultsPanelState, reduceOnHistory, reduceOnShowWelcome } from './sparql-results-panel-state';
import stylesheet from './sparql-results-panel.css';

/**
 * Main webview component for displaying SPARQL query results and history.
 */
function SparqlResultsPanel() {
	// Initialize state from WebviewHost if available
	const getInitialState = (): SparqlResultsPanelState => {
		const previousState = WebviewHost.getState();

		if (previousState && Array.isArray(previousState.activeQueries)) {
			const activeQueries = previousState.activeQueries as SparqlQueryExecutionState[];
			return {
				...previousState,
				activeTabIndex: 0,
				pendingSelectQueryId: undefined,
				activeQueries: activeQueries.filter(q =>
					!q.isBackground &&
					q.documentIri &&
					!q.documentIri.startsWith('untitled:')
				)
			};
		}

		return {
			renderKey: 0,
			activeQueries: [],
			activeTabIndex: 0
		};
	};

	const [state, setState] = useState<SparqlResultsPanelState>(getInitialState);

	// Set up messaging with message handler
	const handleMessage = useCallback((message: SparqlResultsWebviewMessages) => {
		if (message.id === 'PostSparqlQueryHistory') {
			setState(prev => reduceOnHistory(prev, message.history, message.selectQueryId));
		} else if (message.id === 'ShowSparqlWelcome') {
			// Opening the panel from the status bar selects the welcome tab instead
			// of restoring the last active query tab.
			setState(reduceOnShowWelcome);
		} else if (message.id === 'UpdateQueryDocumentIri') {
			// The documentIri now points to the opened query document whose content is the query
			// itself, so it is no longer "generated" — clear the flag so repeat clicks are stable.
			setState(prev => ({
				...prev,
				activeQueries: prev.activeQueries.map(q =>
					q.id === message.queryId ? { ...q, documentIri: message.documentIri, isGenerated: false } : q
				)
			}));
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlResultsWebviewMessages>(handleMessage);

	// Add stylesheets
	useSharedStylesheets();
	useStylesheet('sparql-webview-styles', stylesheet);

	// Tab reference with change handler
	const tabsRef = useVscodeElementRef<HTMLElement & { selectedIndex: number }, { selectedIndex: number }>(
		'vsc-tabs-select',
		(_element, event) => {
			const newIndex = event.detail.selectedIndex;
			setState(prev => ({ ...prev, activeTabIndex: newIndex }));
			restoreSparqlQueryResults(state.activeQueries[newIndex - 1]);
		}
	);

	// Restore the persisted query once on mount; re-running on later state changes
	// would re-request results the user has already navigated away from.
	useEffect(() => {
		if (state.activeTabIndex > 0) {
			const query = state.activeQueries[state.activeTabIndex - 1];
			restoreSparqlQueryResults(query);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Save state to WebviewHost when it changes
	useEffect(() => {
		const savedState: SparqlResultsPanelState = {
			renderKey: 0,
			activeTabIndex: state.activeTabIndex,
			activeQueries: state.activeQueries.map(q => ({
				...q,
				// Avoid storing large result sets in state..
				result: undefined,
				error: undefined,
				rawResponse: undefined
			}))
		};

		WebviewHost.setState(savedState);
	}, [state.activeTabIndex, state.activeQueries]);

	const restoreSparqlQueryResults = (query: SparqlQueryExecutionState) => {
		if (query && query.documentIri && !query.error && !query.result) {
			messaging?.postMessage({
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
	};

	const closeQuery = (query: SparqlQueryExecutionState) => {
		setState(prevState => {
			const activeQueries = prevState.activeQueries.filter(q => q.id !== query.id);
			let activeTabIndex = prevState.activeTabIndex;

			if (activeTabIndex > activeQueries.length) {
				activeTabIndex = activeQueries.length;
			}

			return {
				...prevState,
				activeQueries: activeQueries,
				activeTabIndex: activeTabIndex
			};
		});
	};

	const getQueryTypeIcon = (query: SparqlQueryExecutionState) => {
		if (query.error) {
			return <span className="codicon codicon-error tab-error"></span>;
		}

		if (query.queryType === 'bindings') {
			return <span className="codicon codicon-table"></span>;
		}

		if (query.queryType === 'boolean') {
			return <span className="codicon codicon-question"></span>;
		}

		if (query.queryType === 'quads') {
			return <span className="codicon codicon-file"></span>;
		}
	};

	return (
		<div className="mentor-panel">
			<vscode-tabs ref={tabsRef} selectedIndex={state.activeTabIndex} className="vscode-tabs-slim">
				<vscode-tab-header slot="header" id="0">
					<div className="tab-header-content">
						<span className="codicon codicon-list-selection"></span>
					</div>
				</vscode-tab-header>
				<vscode-tab-panel>
					<SparqlWelcomeView />
				</vscode-tab-panel>
				{state.activeQueries.map((query, index) => (
				<Fragment key={query.id}>
					<vscode-tab-header slot="header" id={(index + 1).toString()}>
						<div className="tab-header-content">
							{getQueryTypeIcon(query)}
							<span>{getDisplayName(query)}</span>
							<a className="codicon codicon-close" role="button" title="Close"
								onClick={(e) => {
									e.stopPropagation();
									closeQuery(query);
									}}
								></a>
							</div>
						</vscode-tab-header>
						<vscode-tab-panel>
							<SparqlResultsView
								messaging={messaging}
								queryContext={query}
								defaultPageSize={100} />
						</vscode-tab-panel>
					</Fragment>
				))}
			</vscode-tabs>
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsPanel />);