import { createRoot } from 'react-dom/client';
import { Fragment } from 'react';
import { WebviewComponent, WebviewComponentProps } from '@/views/webview-component';
import { WebviewMessaging } from '@/views/webview-messaging';
import { SparqlQueryState } from '@/services/sparql-query-state';
import { SparqlResultsTable } from './sparql-results-table';
import { SparqlResultsWelcomeView } from './sparql-results-welcome-view';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import { getFileName } from '@/utilities';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-webview.css';

interface SparqlResultsWebviewProps extends WebviewComponentProps {
	messaging?: WebviewMessaging<SparqlResultsWebviewMessages>;
}

interface SparqlResultsWebviewState {
	renderKey?: number;
	queryState?: SparqlQueryState;
	openQueries: SparqlQueryState[];
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
class SparqlResultsWebview extends WebviewComponent<SparqlResultsWebviewProps, SparqlResultsWebviewState> {
	private messaging: WebviewMessaging<SparqlResultsWebviewMessages>;

	constructor(props: SparqlResultsWebviewProps) {
		super(props);

		this.state = {
			renderKey: 0,
			openQueries: [],
			activeTabIndex: 0
		};

		// Initialize messaging
		const vscode = (window as any).acquireVsCodeApi();

		this.messaging = {
			postMessage: (message) => vscode.postMessage(message),
			onMessage: (handler) => {
				const messageHandler = (event: MessageEvent) => handler(event.data);
				window.addEventListener('message', messageHandler);
				return () => window.removeEventListener('message', messageHandler);
			},
		};
	}

	componentDidMount() {
		this.addStylesheet('codicon-styles', codicons);
		this.addStylesheet('sparql-webview-styles', stylesheet);

		const handleMessage = (message: SparqlResultsWebviewMessages) => {
			switch (message.id) {
				case 'SetSparqlQueryState': {
					this.addOrUpdateQuery(message.queryState);
					break;
				}
			}
		};

		this.messaging.onMessage(handleMessage);
	}

	private addOrUpdateQuery = (queryState: SparqlQueryState) => {
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

			return {
				...prevState,
				renderKey: (prevState.renderKey || 0) + 1,
				openQueries: queries,
				activeTabIndex: activeIndex
			};
		});
	};

	private closeQuery = (documentIri: string) => {
		this.setState(prevState => {
			const queries = prevState.openQueries.filter(q => q.documentIri !== documentIri);

			return {
				...prevState,
				openQueries: queries,
				activeTabIndex: Math.min(prevState.activeTabIndex, queries.length)
			};
		});
	};

	render() {
		const { openQueries, activeTabIndex } = this.state;

		return (
			<vscode-tabs selectedIndex={activeTabIndex} className="vscode-tabs-slim">
				{/* Welcome tab */}
				<vscode-tab-header slot="header" id="0">
					<div className="tab-header-content">
						<span className="codicon codicon-list-selection"></span>
					</div>
				</vscode-tab-header>
				<vscode-tab-panel>
					<SparqlResultsWelcomeView messaging={this.messaging} />
				</vscode-tab-panel>

				{/* Dynamic query result tabs */}
				{openQueries.map((queryState, index) => (
					<Fragment key={queryState.documentIri}>
						<vscode-tab-header slot="header" id={(index + 1).toString()}>
							<div className="tab-header-content" onClick={() => this.setState({ activeTabIndex: index + 1 })}>
								{queryState.error && (
									<span className="codicon codicon-error tab-error"></span>
								)}
								<span>{getFileName(queryState.documentIri)}</span>
								<a className="codicon codicon-close" role="button" title="Close"
									onClick={(e) => {
										e.stopPropagation();
										this.closeQuery(queryState.documentIri);
									}}
								></a>
							</div>
						</vscode-tab-header>
						<vscode-tab-panel>
							<SparqlResultsTable
								messaging={this.messaging}
								queryContext={queryState}
							/>
						</vscode-tab-panel>
					</Fragment>
				))}
			</vscode-tabs>
		);
	}
}

createRoot(document.getElementById('root')!).render(<SparqlResultsWebview />);