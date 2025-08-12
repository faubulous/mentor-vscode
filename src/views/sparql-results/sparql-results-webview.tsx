import { createRoot } from 'react-dom/client';
import { Fragment } from 'react';
import { WebviewHost } from '@/views/webview-host';
import { WebviewComponent } from '@/views/webview-component';
import { SparqlQueryExecutionState, getDisplayName } from '@/services/sparql-query-state';
import { SparqlResultsTable } from './sparql-results-table';
import { SparqlResultsWelcomeView } from './sparql-results-welcome-view';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-webview.css';

interface SparqlResultsWebviewState {
	renderKey?: number;
	openQueries: SparqlQueryExecutionState[];
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
class SparqlResultsWebview extends WebviewComponent<
	{},
	SparqlResultsWebviewState,
	SparqlResultsWebviewMessages
> {
	messaging = WebviewHost.getMessaging<SparqlResultsWebviewMessages>();

	constructor(props: {}) {
		super(props);

		this.state = {
			renderKey: 0,
			openQueries: [],
			activeTabIndex: 0
		};

		// Restore previous state if available
		const previousState = WebviewHost.getState();

		if (previousState) {
			this.state = {
				...this.state,
				...previousState
			};
		}
	}

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('codicon-styles', codicons);
		this.addStylesheet('sparql-webview-styles', stylesheet);

		console.info('componentDidMount', this.state);

		if (this.state.activeTabIndex > 0) {
			const queryState = this.state.openQueries[this.state.activeTabIndex - 1];

			if (queryState) {
				this.messaging.postMessage({
					id: 'ExecuteCommand',
					command: 'mentor.action.executeSparqlQueryFromDocument',
					args: [queryState.documentIri]
				});
			}
		}
	}

	componentDidUpdate() {
		// Force the tabs component to update the selected index
		const tabsElement = document.querySelector('vscode-tabs') as any;

		if (tabsElement && tabsElement.selectedIndex !== this.state.activeTabIndex) {
			tabsElement.selectedIndex = this.state.activeTabIndex;
		}

		WebviewHost.setState({
			renderKey: 0,
			openQueries: this.state.openQueries.map(q => ({
				...q,
				result: undefined, // Avoid storing large result sets in state.
				error: undefined // Avoid storing error details in state.
			})),
			activeTabIndex: this.state.activeTabIndex
		});
	}

	componentDidReceiveMessage(message: SparqlResultsWebviewMessages): void {
		console.debug('componentDidRevceiveMessage', message);

		switch (message.id) {
			case 'RestoreState': {
				this.setState(message.state);
				break;
			}
			case 'SetSparqlQueryState': {
				this._addOrUpdateQuery(message.queryState);
				break;
			}
		}
	}

	private _addOrUpdateQuery(queryState: SparqlQueryExecutionState) {
		this.setState(prevState => {
			const n = prevState.openQueries.findIndex(q => q.documentIri === queryState.documentIri);

			let queries;
			let activeIndex;

			if (n >= 0) {
				queries = [...prevState.openQueries];
				queries[n] = queryState;
				activeIndex = n + 1;
			} else {
				queries = [...prevState.openQueries, queryState];
				activeIndex = queries.length;
			}

			console.debug('_addOrUpdateQuery', n, activeIndex);

			return {
				...prevState,
				renderKey: (prevState.renderKey || 0) + 1,
				openQueries: queries,
				activeTabIndex: activeIndex
			};
		});
	};

	private _closeQuery = (documentIri: string) => {
		this.setState(prevState => {
			const queries = prevState.openQueries.filter(q => q.documentIri !== documentIri);

			return {
				...prevState,
				openQueries: queries,
				activeTabIndex: Math.min(prevState.activeTabIndex, queries.length)
			};
		});
	};

	private _setActiveTab = (index: number) => {
		this.setState({ activeTabIndex: index });
	};

	render() {
		const { openQueries, activeTabIndex } = this.state;

		console.debug('render', { openQueries, activeTabIndex });

		return (
			<vscode-tabs selectedIndex={activeTabIndex} className="vscode-tabs-slim">
				{/* Welcome tab */}
				<vscode-tab-header slot="header" id="0">
					<div className="tab-header-content">
						<span className="codicon codicon-list-selection"></span>
					</div>
				</vscode-tab-header>
				<vscode-tab-panel>
					<SparqlResultsWelcomeView />
				</vscode-tab-panel>

				{/* Dynamic query result tabs */}
				{openQueries.map((queryState, index) => (
					<Fragment key={queryState.documentIri}>
						<vscode-tab-header slot="header" id={(index + 1).toString()}>
							<div className="tab-header-content">
								{queryState.error && (
									<span className="codicon codicon-error tab-error"></span>
								)}
								{queryState.result?.type === 'bindings' && (
									<span className="codicon codicon-table"></span>
								)}
								<span>{getDisplayName(queryState)}</span>
								<a className="codicon codicon-close" role="button" title="Close"
									onClick={(e) => {
										e.stopPropagation();
										this._closeQuery(queryState.documentIri);
									}}
								></a>
							</div>
						</vscode-tab-header>
						<vscode-tab-panel>
							<SparqlResultsTable messaging={this.messaging} queryContext={queryState} />
						</vscode-tab-panel>
					</Fragment>
				))}
			</vscode-tabs>
		);
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlResultsWebview />);