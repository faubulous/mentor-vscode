import { createRoot } from 'react-dom/client';
import { Fragment, useState, useEffect, useCallback } from 'react';
import { WebviewHost } from '@src/views/webviews/webview-host';
import { useWebviewMessaging, useStylesheet, useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { SparqlQueryExecutionState, getDisplayName } from '@src/services/sparql-query-state';
import { SparqlResultsView } from './components/sparql-results-view';
import { SparqlWelcomeView } from './components/sparql-welcome-view';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';
import stylesheet from './sparql-results-panel.css';

/**
 * State for the SPARQL results panel component.
 */
interface SparqlResultsPanelState {
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
}

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
				activeQueries: activeQueries.filter(q => !q.documentIri.startsWith('untitled:'))
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
			onDidChangeQueryHistory(message.history);
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlResultsWebviewMessages>(handleMessage);

	// Add stylesheets
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

	// Restore query on mount if needed
	useEffect(() => {
		if (state.activeTabIndex > 0) {
			const query = state.activeQueries[state.activeTabIndex - 1];
			restoreSparqlQueryResults(query);
		}
	}, []); // Only run on mount

	// Save state to WebviewHost when it changes
	useEffect(() => {
		const savedState: SparqlResultsPanelState = {
			renderKey: 0,
			activeTabIndex: state.activeTabIndex,
			activeQueries: state.activeQueries.map(q => ({
				...q,
				// Avoid storing large result sets in state..
				result: undefined,
				error: undefined
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

	const onDidChangeQueryHistory = (history: SparqlQueryExecutionState[]) => {
		setState(prevState => {
			const query = history[0];

			if (!query || !shouldHandleQueryResults(query)) {
				return prevState;
			}

			const n = prevState.activeQueries.findIndex(q => q.documentIri === query.documentIri);

			const activeQueries = [...prevState.activeQueries];
			let activeQueryIndex = n;

			if (n >= 0) {
				activeQueries.splice(n, 1, query);
				activeQueryIndex = n;
			} else {
				activeQueries.push(query);
				activeQueryIndex = activeQueries.length - 1;
			}

			const activeTabIndex = activeQueryIndex + 1;

			return {
				...prevState,
				renderKey: (prevState.renderKey || 0) + 1,
				activeTabIndex: activeTabIndex,
				activeQueries: activeQueries,
			};
		});
	};

	const shouldHandleQueryResults = (queryState: SparqlQueryExecutionState) => {
		if (queryState.queryType === 'quads' || queryState.queryType === 'void') {
			return false;
		}

		if (queryState.notebookIri) {
			return false;
		}

		return true;
	};

	const closeQuery = (documentIri: string) => {
		setState(prevState => {
			const activeQueries = prevState.activeQueries.filter(q => q.documentIri !== documentIri);
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
					<Fragment key={query.documentIri}>
						<vscode-tab-header slot="header" id={(index + 1).toString()}>
							<div className="tab-header-content">
								{getQueryTypeIcon(query)}
								<span>{getDisplayName(query)}</span>
								<a className="codicon codicon-close" role="button" title="Close"
									onClick={(e) => {
										e.stopPropagation();
										closeQuery(query.documentIri);
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