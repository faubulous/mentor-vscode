import { useState, useEffect, useCallback } from 'react';
import { useWebviewMessaging } from '@src/views/webviews/hooks';
import { SparqlQueryExecutionState, getDisplayName } from '@src/languages/sparql/services/sparql-query-state';
import { getFolderPath, shortenPathStart } from '@src/utilities/uri';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import sparqlFileIconDark from '../../../../../../media/icons/dark/sparql-file.svg';
import sparqlFileIconLight from '../../../../../../media/icons/light/sparql-file.svg';

/**
 * Maximum number of characters of the shortened workspace path shown beside a query's file
 * name. Deeper paths are shortened from the start; the column's CSS ellipsis then absorbs
 * whatever still does not fit the rendered width.
 */
const MAX_DISPLAY_PATH_LENGTH = 40;

/**
 * Get the workspace-relative folder holding a query document.
 * @param queryState The query execution state of a history entry.
 * @returns The folder path, an empty string for the workspace root, or `undefined` when the
 * query is not backed by a workspace file (e.g. an untitled editor).
 */
function getWorkspaceFolder(queryState: SparqlQueryExecutionState): string | undefined {
	return queryState.workspaceIri ? getFolderPath(queryState.workspaceIri) : undefined;
}

/**
 * Get the folder label shown beside a query's file name.
 * @param folder A workspace-relative folder path, empty for the workspace root.
 * @returns `~` for the workspace root, otherwise the folder shortened from the start so its
 * most specific segments stay readable in the narrow column.
 */
function getFolderLabel(folder: string): string {
	return folder.length > 0 ? `~/${shortenPathStart(folder, MAX_DISPLAY_PATH_LENGTH)}` : '~';
}

/**
 * Get the tooltip of a query row, showing the untruncated workspace-relative location of the
 * document so the full path stays reachable once the label or the folder has been shortened.
 * @param folder The workspace-relative folder, empty for the workspace root, or `undefined`
 * when the query is not backed by a workspace file.
 * @param displayName The row's visible label.
 * @returns The `~`-prefixed workspace path of the document, falling back to the display name
 * for queries without a workspace file.
 */
function getRowTooltip(folder: string | undefined, displayName: string): string {
	if (folder === undefined) {
		return displayName;
	}

	return folder.length > 0 ? `~/${folder}/${displayName}` : `~/${displayName}`;
}

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
		<div className="column column-grow">
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
				{history.length > 0 && history.map((queryState, index) => {
					const displayName = getDisplayName(queryState);
					const workspaceFolder = getWorkspaceFolder(queryState);
					const tooltip = getRowTooltip(workspaceFolder, displayName);

					return (
						<div key={`${queryState.documentIri}-${index}`} className="history-item">
							<img className="file-icon file-icon-dark" src={sparqlFileIconDark} alt="" />
							<img className="file-icon file-icon-light" src={sparqlFileIconLight} alt="" />
							<a className="file-link" title={tooltip} onClick={() => handleOpenDocument(queryState)}>
								<span>{displayName}</span>
							</a>
							{workspaceFolder !== undefined && (
								<span className="folder folder-path muted" title={tooltip}>
									{getFolderLabel(workspaceFolder)}
								</span>
							)}
							<span className="actions">
								<a className='execute-button codicon codicon-play' role="button" title="Run"
									onClick={() => handleExecuteQuery(queryState)}>
								</a>
								<a className="remove-button codicon codicon-close" role="button" title="Remove"
									onClick={() => handleRemoveFromHistory(queryState)}>
								</a>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
