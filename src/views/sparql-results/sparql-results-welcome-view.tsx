import { WebviewComponent } from '@/views/webview-component';
import { getFileName } from '@/utilities';
import { WebviewMessaging } from '../webview-messaging';
import { SparqlQueryState } from '@/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import stylesheet from './sparql-results-welcome-view.css';

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
			}
		});

		this._loadHistory();
	}

	render() {
		const recentQueries = this.state?.history || [];

		return (
			<div className="container">
				<div className="muted">This panel displays the status and results of <a href="https://www.w3.org/TR/sparql11-query/" target="_blank">SPARQL</a> queries that were executed from files in the editor.</div>
				<div className="row">
					<div className="column">
						<vscode-toolbar-container className="vertical link-buttons link-buttons-xl">
							<vscode-toolbar-button onClick={() => this._createSparqlQueryFile()}>
								<span className="codicon codicon-new-file"></span>
								<span className="label">New Query...</span>
							</vscode-toolbar-button>
							<vscode-toolbar-button onClick={() => this._selectSparqlQueryFile()}>
								<span className="codicon codicon-folder-opened"></span>
								<span className="label">Open Query...</span>
							</vscode-toolbar-button>
							<vscode-toolbar-button onClick={() => this._connectToEndpoint()}>
								<span className="codicon codicon-debug-disconnect"></span>
								<span className="label">Connect to Endpoint...</span>
							</vscode-toolbar-button>
						</vscode-toolbar-container>
					</div>
					<div className="column">
						<vscode-toolbar-container className="header">
							<h3>Recent Queries</h3>
							<vscode-toolbar-button onClick={() => this._clearHistory()}>
								<span className="codicon codicon-clear-all muted"></span>
							</vscode-toolbar-button>
						</vscode-toolbar-container>
						<vscode-toolbar-container className="vertical link-buttons">
							{recentQueries.length === 0 && <span className="muted">No recent queries.</span>}
							{recentQueries.length > 0 && recentQueries.map(query => (
								<vscode-toolbar-button onClick={() => this._openDocument(query.documentIri)}>
									<span className='label'>{this._getFileName(query.documentIri)}</span>
								</vscode-toolbar-button>
							))}
						</vscode-toolbar-container>
					</div>
				</div>
			</div>
		);
	}

	private _loadHistory() {
		this.props.messaging?.postMessage({ id: 'GetSparqlQueryHistoryRequest' });
	}

	private _clearHistory() {
		this.executeCommand('mentor.action.clearSparqlQueryHistory');

		this._loadHistory();
	}

	private _getFileName(documentIri: string) {
		return documentIri ? getFileName(documentIri) : documentIri;
	}

	private _openDocument(documentIri: string) {
		this.executeCommand('mentor.action.openDocument', documentIri);
	}

	private _createSparqlQueryFile() {
		this.executeCommand('mentor.action.createSparqlQueryFile');
	}

	private _selectSparqlQueryFile() {
		this.executeCommand('mentor.action.openFileByLanguage', 'sparql');
	}

	private _connectToEndpoint() {
		this.executeCommand('mentor.action.connectToSparqlEndpoint');
	}
}