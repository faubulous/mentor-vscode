import { createRoot } from 'react-dom/client';
import { Fragment } from 'react';
import { WebviewHost } from '@/webviews/webview-host';
import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlQueryExecutionState, getDisplayName } from '@/services/sparql-query-state';
import { SparqlResultsView } from './components/sparql-results-view';
import { SparqlWelcomeView } from './components/sparql-welcome-view';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-panel.css';

/**
 * State for the SPARQL results panel component.
 */
interface SparqlResultsPanelState {
	/**
	 * A key that forces a full re-render of the component when changed.
	 * This is useful to reset internal state of child components that do not
	 * properly respond to prop changes.
	 */
	renderKey?: number;

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
 * Main webview component for displaying SPARQL query results and history. This component 
 * renders either a table of SPARQL query results when queries are executed from files, or 
 * a welcome view showing the history of previous queries when no active results are present.
 * 
 * It handles bidirectional messaging between the webview and VS Code extension host to 
 * execute commands and retrieve SPARQL query history, automatically switching between the 
 * results table and welcome view based on the incoming message type and data.
 * 
 * @returns A React component that renders either query results or the welcome view
 */
class SparqlResultsPanel extends WebviewComponent<
	{},
	SparqlResultsPanelState,
	SparqlResultsWebviewMessages
> {
	messaging = WebviewHost.getMessaging<SparqlResultsWebviewMessages>();

	state: SparqlResultsPanelState = {
		renderKey: 0,
		activeQueries: [],
		activeTabIndex: 0
	};

	constructor(props: {}) {
		super(props);

		// Restore previous state if available.
		const previousState = WebviewHost.getState();

		if (previousState && Array.isArray(previousState.activeQueries)) {
			// Do not restore untitled queries that are not saved.
			const activeQueries = previousState.activeQueries as SparqlQueryExecutionState[];

			this.state = {
				...previousState,
				activeTabIndex: 0,
				activeQueries: activeQueries.filter(q => !q.documentIri.startsWith('untitled:'))
			};
		}
	}

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('codicon-styles', codicons);
		this.addStylesheet('sparql-webview-styles', stylesheet);

		// Listen for tab selection changes
		const tabsElement = document.querySelector('vscode-tabs');

		if (tabsElement) {
			tabsElement.addEventListener('vsc-tabs-select', this._handleTabChange);
		}

		if (this.state.activeTabIndex > 0) {
			const query = this.state.activeQueries[this.state.activeTabIndex - 1];

			this._restoreSparqlQueryResults(query);
		}
	}

	componentWillUnmount() {
		const tabsElement = document.querySelector('vscode-tabs');

		if (tabsElement) {
			tabsElement.removeEventListener('vsc-tabs-select', this._handleTabChange);
		}
	}

	private _handleTabChange = (event: any) => {
		const newIndex = event.detail.selectedIndex;

		this.setState({ activeTabIndex: newIndex });

		this._restoreSparqlQueryResults(this.state.activeQueries[newIndex - 1]);
	};

	private _restoreSparqlQueryResults(query: SparqlQueryExecutionState) {
		if (query && query.documentIri && !query.error && !query.result) {
			this.messaging.postMessage({
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
	}

	componentDidUpdate() {
		const savedState: SparqlResultsPanelState = {
			renderKey: 0,
			activeTabIndex: this.state.activeTabIndex,
			activeQueries: this.state.activeQueries
				.map(q => ({
					...q,
					// Avoid storing large result sets in state..
					result: undefined,
					error: undefined
				}))
		};

		WebviewHost.setState(savedState);
	}

	componentDidReceiveMessage(message: SparqlResultsWebviewMessages): void {
		switch (message.id) {
			case 'PostSparqlQueryHistory': {
				this._onDidChangeQueryHistory(message.history);
				break;
			}
		}
	}

	private _onDidChangeQueryHistory(history: SparqlQueryExecutionState[]) {
		this.setState(prevState => {
			const query = history[0];

			if (!query || !this._shouldHandleQueryResults(query)) {
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

	/**
	 * Indicates if a SPARQL query result should be handled by the panel.
	 * @param queryState A SPARQL query execution state.
	 * @returns `true` if the query result is supported, `false` otherwise.
	 */
	private _shouldHandleQueryResults(queryState: SparqlQueryExecutionState) {
		if(queryState.queryType === 'quads' || queryState.queryType === 'void') {
			return false;
		}

		if(queryState.notebookIri) {
			return false;
		}

		return true;
	}

	private _closeQuery = (documentIri: string) => {
		const activeQueries = this.state.activeQueries.filter(q => q.documentIri !== documentIri);
		let activeTabIndex = this.state.activeTabIndex;

		if (activeTabIndex > activeQueries.length) {
			activeTabIndex = activeQueries.length;
		}

		this.setState(prevState => {
			return {
				...prevState,
				activeQueries: activeQueries,
				activeTabIndex: activeTabIndex
			};
		});
	};

	render() {
		return (
			<div className="mentor-panel">
				<vscode-tabs selectedIndex={this.state.activeTabIndex} className="vscode-tabs-slim">
					<vscode-tab-header slot="header" id="0">
						<div className="tab-header-content">
							<span className="codicon codicon-list-selection"></span>
						</div>
					</vscode-tab-header>
					<vscode-tab-panel>
						<SparqlWelcomeView />
					</vscode-tab-panel>
					{this.state.activeQueries.map((query, index) => (
						<Fragment key={query.documentIri}>
							<vscode-tab-header slot="header" id={(index + 1).toString()}>
								<div className="tab-header-content">
									{this._getQueryTypeIcon(query)}
									<span>{getDisplayName(query)}</span>
									<a className="codicon codicon-close" role="button" title="Close"
										onClick={(e) => {
											e.stopPropagation();
											this._closeQuery(query.documentIri);
										}}
									></a>
								</div>
							</vscode-tab-header>
							<vscode-tab-panel>
								<SparqlResultsView
									messaging={this.messaging}
									queryContext={query}
									defaultPageSize={100} />
							</vscode-tab-panel>
						</Fragment>
					))}
				</vscode-tabs>
			</div>
		);
	}

	private _getQueryTypeIcon(query: SparqlQueryExecutionState) {
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
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsPanel />);