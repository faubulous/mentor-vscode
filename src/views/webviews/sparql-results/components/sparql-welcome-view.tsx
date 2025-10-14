import { WebviewComponent } from '@src/views/webviews/webview-component';
import { WebviewHost } from '@src/views/webviews/webview-host';
import { SparqlQueryExecutionState, getDisplayName } from '@src/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import codicons from '$/codicon.css';
import stylesheet from './sparql-welcome-view.css';

/**
 * State for the SparqlWelcomeView component.
 */
interface SparqlWelcomeViewState {
	/**
	 * The history of executed SPARQL queries, sorted by most recent first.
	 */
	history?: SparqlQueryExecutionState[];
}

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export class SparqlWelcomeView extends WebviewComponent<
	{},
	SparqlWelcomeViewState,
	SparqlResultsWebviewMessages
> {
	messaging = WebviewHost.getMessaging<SparqlResultsWebviewMessages>();

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('codicon-styles', codicons);
		this.addStylesheet('sparql-welcome-styles', stylesheet);

		this._loadHistory();
	}

	componentDidReceiveMessage(message: SparqlResultsWebviewMessages): void {
		switch (message.id) {
			case 'PostSparqlQueryHistory': {
				this.setState({ history: message.history });
				return;
			}
		}
	}

	render() {
		const recentQueries = this.state?.history || [];

		return (
			<vscode-scrollable>
				<div className="sparql-welcome-view-container">
					<div className="column">
						<div className="header">
							<h3>Start</h3>
						</div>
						<div className="body button-list button-list-xl">
							<vscode-toolbar-button onClick={() => this._handleCreateSparqlQueryFile()}>
								<vscode-icon name="new-file" className="new-file"></vscode-icon>
								<span className="label">New Query...</span>
							</vscode-toolbar-button>
							<vscode-toolbar-button onClick={() => this._handleSelectSparqlQueryFile()}>
								<vscode-icon name="folder-opened" className="folder-opened"></vscode-icon>
								<span className="label">Open Query...</span>
							</vscode-toolbar-button>
							<vscode-toolbar-button onClick={() => this._handleConnectToEndpoint()}>
								<vscode-icon name="debug-disconnect" className="debug-disconnect"></vscode-icon>
								<span className="label">Connect to Endpoint...</span>
							</vscode-toolbar-button>
						</div>
					</div>
					<div className="column">
						<div className="header">
							<h3>Recent Queries</h3>
							<vscode-toolbar-button onClick={() => this._handleClearHistory()} disabled={recentQueries.length === 0}>
								<span className="muted">Clear</span>
							</vscode-toolbar-button>
						</div>
						<div className="body button-list">
							{recentQueries.length === 0 && <span className="muted">No recent queries in this workspace.</span>}
							{recentQueries.length > 0 && recentQueries.map((queryState, index) => (
								<div key={`${queryState.documentIri}-${index}`} className="history-item">
									<vscode-icon
										actionIcon
										name="play"
										title="Execute"
										className="play"
										onClick={(e) => this._handleExecuteQuery(queryState, e)}
									/>
									<a className="file-link" onClick={(e) => this._handleOpenDocument(queryState, e)}>
										<span>{getDisplayName(queryState)}</span>
									</a>
									<span className="folder muted">{this._getWorkspacePath(queryState)}</span>
									<vscode-icon
										name="close"
										title="Remove"
										className="remove"
										onClick={(e) => this._handleRemoveFromHistory(queryState, e)}
									/>
								</div>
							))}
						</div>
					</div>
				</div>
			</vscode-scrollable>
		);
	}

	private _getWorkspacePath(queryState: SparqlQueryExecutionState): string | undefined {
		if (queryState.workspaceIri) {
			const workspacePath = queryState.workspaceIri.split(':')[1];
			const folderPath = workspacePath.split('/').slice(0, -1).join('/');

			return folderPath.length > 0 ? `~${folderPath}` : '~/';
		}
	}

	private _executeCommand(command: string, ...args: any[]) {
		this.messaging.postMessage({ id: 'ExecuteCommand', command, args });
	}

	private _loadHistory() {
		this.messaging.postMessage({ id: 'GetSparqlQueryHistory' });
	}

	private _handleClearHistory() {
		this._executeCommand('mentor.command.clearQueryHistory');

		this._loadHistory();
	}

	private _handleExecuteQuery(query: SparqlQueryExecutionState, e?: React.MouseEvent) {
		this._executeCommand('mentor.command.executeSparqlQuery', {
			documentIri: query.documentIri,
			workspaceIri: query.workspaceIri,
			notebookIri: query.notebookIri,
			cellIndex: query.cellIndex,
			query: query.query
		});

		if (query.documentIri) {
			this._executeCommand('mentor.command.openDocument', query.documentIri);
		}
	}

	private _handleOpenDocument(query: SparqlQueryExecutionState, e?: React.MouseEvent) {
		this._executeCommand('mentor.command.openDocument', query.documentIri);
	}

	private _handleRemoveFromHistory(query: SparqlQueryExecutionState, e?: React.MouseEvent) {
		this._executeCommand('mentor.command.removeFromQueryHistory', query.documentIri);
	}

	private _handleCreateSparqlQueryFile() {
		this._executeCommand('mentor.command.createSparqlQueryFile');
	}

	private _handleSelectSparqlQueryFile() {
		this._executeCommand('mentor.command.openFileByLanguage', 'sparql');
	}

	private _handleConnectToEndpoint() {
		this._executeCommand('mentor.command.createSparqlConnection');
	}
}