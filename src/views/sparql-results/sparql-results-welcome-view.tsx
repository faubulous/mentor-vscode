import { WebviewComponent } from '@/views/webview-component';
import { getFileName } from '@/utilities';
import { WebviewMessaging } from '../webview-messaging';
import { SparqlQueryState } from '@/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import stylesheet from './sparql-results-welcome-view.css';
import React = require('react');

interface SparqlResultsWelcomeViewProps {
	messaging?: WebviewMessaging<SparqlResultsWebviewMessages>;
}

interface SparqlResultsWelcomeViewState {
	history?: SparqlQueryState[];
}

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export class SparqlResultsWelcomeView extends WebviewComponent<
	SparqlResultsWelcomeViewProps,
	SparqlResultsWelcomeViewState
> {

	componentDidMount() {
		this.addStylesheet('sparql-welcome-styles', stylesheet);

		this.props.messaging?.onMessage(message => {
			switch (message.id) {
				case 'GetSparqlQueryHistoryResponse': {
					this.setState({ history: message.history });
					return;
				}
				case 'SparqlQueryHistoryChanged': {
					this._loadHistory();
					return;
				}
			}
		});

		this._loadHistory();
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
						<vscode-toolbar-button onClick={() => this._handleClearHistory()}>
							<span className="muted">Clear</span>
						</vscode-toolbar-button>
					</vscode-toolbar-container>
					<vscode-toolbar-container className="vertical link-buttons">
						{recentQueries.length === 0 && <span className="muted">No recent queries in this workspace.</span>}
						{recentQueries.length > 0 && recentQueries.map((query, index) => (
							<div key={`${query.documentIri}-${index}`} className="history-item">
								<a className='execute-button codicon codicon-play' role="button" title="Execute"
									onClick={(e) => this._handleExecuteQuery(query, e)}>
								</a>
								<a className="file-link" onClick={(e) => this._handleOpenDocument(query, e)}>
									{this._getFileName(query)}
								</a>
								<a className="remove-button codicon codicon-close" role="button" title="Remove"
									onClick={(e) => this._handleRemoveFromHistory(query, e)}>
								</a>
							</div>
						))}
					</vscode-toolbar-container>
				</div>
			</div>
		);
	}

	private _loadHistory() {
		this.props.messaging?.postMessage({ id: 'GetSparqlQueryHistoryRequest' });
	}

	private _getFileName(query: SparqlQueryState) {
		if (query.notebookIri && query.cellIndex) {
			return getFileName(query.documentIri).split('#')[0] + ':Cell-' + query.cellIndex;
		} else {
			return getFileName(query.documentIri);
		}
	}

	private _handleClearHistory() {
		this.executeCommand('mentor.action.clearQueryHistory');

		this._loadHistory();
	}

	private _handleExecuteQuery(query: SparqlQueryState, e?: React.MouseEvent) {
		e?.stopPropagation();
	}

	private _handleOpenDocument(query: SparqlQueryState, e?: React.MouseEvent) {
		e?.stopPropagation();

		if (query.documentIri.startsWith('untitled:')) {
			this.executeCommand('mentor.action.restoreUntitledDocument', query.documentIri, query.query);
		} else {
			console.warn(query.documentIri);

			this.executeCommand('mentor.action.openDocument', query.documentIri);
		}
	}

	private _handleRemoveFromHistory(query: SparqlQueryState, e?: React.MouseEvent) {
		e?.stopPropagation();
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
}