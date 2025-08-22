import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlQueryExecutionState, getDisplayName } from '@/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import { WebviewHost } from '../webview-host';
import stylesheet from './sparql-results-welcome-view.css';

interface SparqlResultsWelcomeViewState {
	history?: SparqlQueryExecutionState[];
}

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export class SparqlResultsWelcomeView extends WebviewComponent<
	{},
	SparqlResultsWelcomeViewState,
	SparqlResultsWebviewMessages
> {
	messaging = WebviewHost.getMessaging<SparqlResultsWebviewMessages>();

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('sparql-welcome-styles', stylesheet);

		this._loadHistory();
	}

	componentDidReceiveMessage(message: SparqlResultsWebviewMessages): void {
		switch (message.id) {
			case 'GetSparqlQueryHistoryResponse': {
				this.setState({ history: message.history });
				return;
			}
			case 'SparqlQueryExecutionEnded': {
				this._loadHistory();
				return;
			}
		}
	}

	render() {
		const recentQueries = this.state?.history || [];

		return (
			<div className="container">
				<div className="column">
					<vscode-toolbar-container className="header">
						<h3>Start</h3>
					</vscode-toolbar-container>
					<vscode-toolbar-container className="vertical link-buttons link-buttons-xl">
						<vscode-toolbar-button onClick={() => this._handleCreateSparqlQueryFile()}>
							<span className="codicon codicon-new-file"></span>
							<span className="label">New Query...</span>
						</vscode-toolbar-button>
						<vscode-toolbar-button onClick={() => this._handleSelectSparqlQueryFile()}>
							<span className="codicon codicon-folder-opened"></span>
							<span className="label">Open Query...</span>
						</vscode-toolbar-button>
						<vscode-toolbar-button onClick={() => this._handleConnectToEndpoint()}>
							<span className="codicon codicon-debug-disconnect"></span>
							<span className="label">Connect to Endpoint...</span>
						</vscode-toolbar-button>
					</vscode-toolbar-container>
				</div>
				<div className="column">
					<vscode-toolbar-container className="header">
						<h3>Recent Queries</h3>
						<vscode-toolbar-button onClick={() => this._handleClearHistory()} disabled={recentQueries.length === 0}>
							<span className="muted">Clear</span>
						</vscode-toolbar-button>
					</vscode-toolbar-container>
					<vscode-toolbar-container className="vertical link-buttons">
						{recentQueries.length === 0 && <span className="muted">No recent queries in this workspace.</span>}
						{recentQueries.length > 0 && recentQueries.map((queryState, index) => (
							<div key={`${queryState.documentIri}-${index}`} className="history-item">
								<a className='execute-button codicon codicon-play' role="button" title="Execute"
									onClick={(e) => this._handleExecuteQuery(queryState, e)}>
								</a>
								<a className="file-link" onClick={(e) => this._handleOpenDocument(queryState, e)}>
									<span>{getDisplayName(queryState)}</span>
								</a>
								<span className="folder muted">{this._getWorkspacePath(queryState)}</span>
								<a className="remove-button codicon codicon-close" role="button" title="Remove"
									onClick={(e) => this._handleRemoveFromHistory(queryState, e)}>
								</a>
							</div>
						))}
					</vscode-toolbar-container>
				</div>
			</div>
		);
	}

	private _getWorkspacePath(queryState: SparqlQueryExecutionState): string | undefined {
		if (queryState.workspaceIri) {
			return '~' + queryState.workspaceIri.split(':')[1];
		}
	}

	private _loadHistory() {
		this.messaging.postMessage({ id: 'GetSparqlQueryHistoryRequest' });
	}

	private _handleClearHistory() {
		this.executeCommand('mentor.action.clearQueryHistory');

		this._loadHistory();
	}

	private _handleExecuteQuery(query: SparqlQueryExecutionState, e?: React.MouseEvent) {
		this.executeCommand('mentor.action.executeSparqlQuery', {
			documentIri: query.documentIri,
			workspaceIri: query.workspaceIri,
			notebookIri: query.notebookIri,
			cellIndex: query.cellIndex,
			query: query.query
		});

		if (query.documentIri) {
			this.executeCommand('mentor.action.openDocument', query.documentIri);
		}
	}

	private _handleOpenDocument(query: SparqlQueryExecutionState, e?: React.MouseEvent) {
		e?.stopPropagation();

		this.executeCommand('mentor.action.openDocument', query.documentIri);
	}

	private _handleRemoveFromHistory(query: SparqlQueryExecutionState, e?: React.MouseEvent) {
		e?.stopPropagation();

		const n = this.state.history?.findIndex(q => q === query);

		if (n !== undefined && n >= 0) {
			this.setState(prevState => ({
				history: prevState.history?.filter((_, index) => index !== n)
			}));

			this.executeCommand('mentor.action.removeFromQueryHistory', n);
		}
	}

	private _handleCreateSparqlQueryFile() {
		this.executeCommand('mentor.action.createSparqlQueryFile');
	}

	private _handleSelectSparqlQueryFile() {
		this.executeCommand('mentor.action.openFileByLanguage', 'sparql');
	}

	private _handleConnectToEndpoint() {
		this.executeCommand('mentor.action.connectToSparqlEndpoint');
	}

	protected executeCommand(command: string, ...args: any[]) {
		this.messaging.postMessage({ id: 'ExecuteCommand', command, args });
	}
}