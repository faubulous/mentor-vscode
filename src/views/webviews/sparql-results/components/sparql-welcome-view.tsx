import { useState, useEffect, useCallback } from 'react';
import { useWebviewMessaging, useStylesheet } from '@src/views/webviews/webview-hooks';
import { SparqlQueryExecutionState, getDisplayName } from '@src/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import stylesheet from './sparql-welcome-view.css';

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export function SparqlWelcomeView() {
	const [history, setHistory] = useState<SparqlQueryExecutionState[]>([]);

	// Message handler
	const handleMessage = useCallback((message: SparqlResultsWebviewMessages) => {
		if (message.id === 'PostSparqlQueryHistory') {
			setHistory(message.history);
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlResultsWebviewMessages>(handleMessage);

	// Add stylesheet
	useStylesheet('sparql-welcome-styles', stylesheet);

	// Load history on mount
	useEffect(() => {
		messaging?.postMessage({ id: 'GetSparqlQueryHistory' });
	}, []);

	// Helper functions
	const executeCommand = (command: string, ...args: any[]) => {
		messaging?.postMessage({ id: 'ExecuteCommand', command, args });
	};

	const loadHistory = () => {
		messaging?.postMessage({ id: 'GetSparqlQueryHistory' });
	};

	const getWorkspacePath = (queryState: SparqlQueryExecutionState): string | undefined => {
		if (queryState.workspaceIri) {
			const workspacePath = queryState.workspaceIri.split(':')[1];
			const folderPath = workspacePath.split('/').slice(0, -1).join('/');

			return folderPath.length > 0 ? `~${folderPath}` : '~';
		}
	};

	// Event handlers
	const handleClearHistory = () => {
		executeCommand('mentor.command.clearQueryHistory');
		loadHistory();
	};

	const handleExecuteQuery = (query: SparqlQueryExecutionState) => {
		executeCommand('mentor.command.executeSparqlQuery', {
			documentIri: query.documentIri,
			workspaceIri: query.workspaceIri,
			notebookIri: query.notebookIri,
			cellIndex: query.cellIndex,
			query: query.query
		});

		if (query.documentIri) {
			executeCommand('mentor.command.openDocument', query.documentIri);
		}
	};

	const handleOpenDocument = (query: SparqlQueryExecutionState) => {
		executeCommand('mentor.command.openDocument', query.documentIri);
	};

	const handleRemoveFromHistory = (query: SparqlQueryExecutionState) => {
		executeCommand('mentor.command.removeFromQueryHistory', query.documentIri);
	};

	const handleCreateSparqlQueryFile = () => {
		executeCommand('mentor.command.createDocumentFromLanguage', 'sparql');
	};

	const handleSelectSparqlQueryFile = () => {
		executeCommand('mentor.command.openFileFromLanguage', 'sparql');
	};

	const handleConnectToEndpoint = () => {
		executeCommand('mentor.command.createSparqlConnection');
	};

	return (
		<vscode-scrollable>
			<div className="sparql-welcome-view-container">
				<div className="column">
					<div className="header">
						<h3>Start</h3>
					</div>
					<div className="body button-list button-list-xl">
						<vscode-toolbar-button onClick={handleCreateSparqlQueryFile}>
							<span className="codicon codicon-new-file"></span>
							<span className="label">New Query...</span>
						</vscode-toolbar-button>
						<vscode-toolbar-button onClick={handleSelectSparqlQueryFile}>
							<span className="codicon codicon-folder-opened"></span>
							<span className="label">Open Query...</span>
						</vscode-toolbar-button>
						<vscode-toolbar-button onClick={handleConnectToEndpoint}>
							<span className="codicon codicon-debug-disconnect"></span>
							<span className="label">Connect to Endpoint...</span>
						</vscode-toolbar-button>
					</div>
				</div>
				<div className="column">
					<div className="header">
						<h3>Recent Queries</h3>
						<vscode-toolbar-button onClick={handleClearHistory} disabled={history.length === 0}>
							<span className="muted">Clear</span>
						</vscode-toolbar-button>
					</div>
					<div className="body button-list">
						{history.length === 0 && <span className="muted">No recent queries in this workspace.</span>}
						{history.length > 0 && history.map((queryState, index) => (
							<div key={`${queryState.documentIri}-${index}`} className="history-item">
								<a className='execute-button codicon codicon-play' role="button" title="Execute"
									onClick={() => handleExecuteQuery(queryState)}>
								</a>
								<a className="file-link" onClick={() => handleOpenDocument(queryState)}>
									<span>{getDisplayName(queryState)}</span>
								</a>
								<span className="folder muted">{getWorkspacePath(queryState)}</span>
								<a className="remove-button codicon codicon-close" role="button" title="Remove"
									onClick={() => handleRemoveFromHistory(queryState)}>
								</a>
							</div>
						))}
					</div>
				</div>
			</div>
		</vscode-scrollable>
	);
}