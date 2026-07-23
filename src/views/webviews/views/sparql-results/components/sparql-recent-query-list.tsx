import { useState, useEffect, useCallback } from 'react';
import { useWebviewMessaging } from '@src/views/webviews/hooks';
import { SparqlQueryExecutionState, getDisplayName } from '@src/languages/sparql/services/sparql-query-state';
import { toDisplayPath, getPath } from '@src/utilities/uri';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import sparqlFileIconDark from '../../../../../../media/icons/dark/sparql-file.svg';
import sparqlFileIconLight from '../../../../../../media/icons/light/sparql-file.svg';

/**
 * The Recent Queries column of the SPARQL results welcome view: lists the
 * workspace's non-background query history, with a header offering an Open
 * button (new query file) and a Clear button, and per-row run / remove actions.
 */
export function SparqlRecentQueryList() {
	const [history, setHistory] = useState<SparqlQueryExecutionState[]>([]);

	const handleMessage = useCallback((message: SparqlResultsWebviewMessages) => {
		if (message.id === 'PostSparqlQueryHistory') {
			setHistory(message.history.filter(q => !q.isBackground));
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlResultsWebviewMessages>(handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetSparqlQueryHistory' });
	}, [messaging]);

	const executeCommand = (command: string, ...args: any[]) => {
		messaging?.postMessage({ id: 'ExecuteCommand', command, args });
	};

	const loadHistory = () => {
		messaging?.postMessage({ id: 'GetSparqlQueryHistory' });
	};

	const getWorkspacePath = (queryState: SparqlQueryExecutionState): string | undefined => {
		if (queryState.workspaceIri) {
			const folderPath = getPath(toDisplayPath(queryState.workspaceIri));

			return folderPath.length > 0 ? `~${folderPath}` : '~';
		}
	};

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

	const handleSelectSparqlQueryFile = () => {
		executeCommand('mentor.command.openFileFromLanguage', 'sparql');
	};

	return (
		<div className="column column-wide">
			<div className="header">
				<h3>Recent Queries</h3>
				<vscode-toolbar-button onClick={handleSelectSparqlQueryFile}>
					<span className="muted">Open</span>
				</vscode-toolbar-button>
				<vscode-toolbar-button onClick={handleClearHistory} disabled={history.length === 0}>
					<span className="muted">Clear</span>
				</vscode-toolbar-button>
			</div>
			<div className="body button-list">
				{history.length === 0 && <span className="muted">No recent queries in this workspace.</span>}
				{history.length > 0 && history.map((queryState, index) => (
					<div key={`${queryState.documentIri}-${index}`} className="history-item">
						<img className="file-icon file-icon-dark" src={sparqlFileIconDark} alt="" />
						<img className="file-icon file-icon-light" src={sparqlFileIconLight} alt="" />
						<a className="file-link" onClick={() => handleOpenDocument(queryState)}>
							<span>{getDisplayName(queryState)}</span>
						</a>
						<span className="folder muted">{getWorkspacePath(queryState)}</span>
						<span className="actions">
							<a className='execute-button codicon codicon-play' role="button" title="Run"
								onClick={() => handleExecuteQuery(queryState)}>
							</a>
							<a className="remove-button codicon codicon-close" role="button" title="Remove"
								onClick={() => handleRemoveFromHistory(queryState)}>
							</a>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
