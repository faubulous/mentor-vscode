import { useState, useEffect, useCallback } from 'react';
import { useWebviewMessaging } from '@src/views/webviews/hooks';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlConnectionGraphStatus, SparqlResultsWebviewMessages } from '../sparql-results-messages';

/**
 * The outcome of the last endpoint test of a connection, kept until the next
 * test or graph listing replaces it.
 */
interface TestResult {
	success: boolean;
	error?: string;
}

/**
 * The Connections column of the SPARQL results welcome view: lists all
 * connections in the query-history look, with a leading new-query button,
 * the cached graph count as details text and test / list-graphs context
 * buttons per row. The header offers a Manage button that opens the
 * Query > Connections settings section.
 */
export function SparqlConnectionsList() {
	const [connections, setConnections] = useState<SparqlConnection[]>([]);
	const [statuses, setStatuses] = useState<Record<string, SparqlConnectionGraphStatus>>({});
	const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
	const [testing, setTesting] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState<Record<string, boolean>>({});

	const handleMessage = useCallback((message: SparqlResultsWebviewMessages) => {
		switch (message.id) {
			case 'PostSparqlConnections': {
				setConnections(message.connections);
				setStatuses(message.statuses);
				return;
			}
			case 'SparqlConnectionGraphsChanged': {
				setStatuses(prev => ({ ...prev, [message.connectionId]: message.status }));
				return;
			}
			case 'SparqlConnectionGraphsLoading': {
				setLoading(prev => ({ ...prev, [message.connectionId]: message.loading }));
				return;
			}
			case 'TestSparqlConnectionResult': {
				setTesting(prev => ({ ...prev, [message.connectionId]: false }));
				setTestResults(prev => ({
					...prev,
					[message.connectionId]: { success: message.success, error: message.error },
				}));
				return;
			}
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlResultsWebviewMessages>(handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetSparqlConnections' });
	}, [messaging]);

	const executeCommand = (command: string, ...args: any[]) => {
		messaging?.postMessage({ id: 'ExecuteCommand', command, args });
	};

	const handleNewQuery = (connection: SparqlConnection) => {
		executeCommand('mentor.command.createQueryForConnection', connection.id);
	};

	const handleEditConnection = (connection: SparqlConnection) => {
		executeCommand('mentor.command.editSparqlConnection', connection);
	};

	const handleTestConnection = (connection: SparqlConnection) => {
		setTesting(prev => ({ ...prev, [connection.id]: true }));
		setTestResults(prev => ({ ...prev, [connection.id]: undefined as any }));
		messaging?.postMessage({ id: 'TestSparqlConnection', connection });
	};

	const handleManageConnections = () => {
		executeCommand('mentor.command.manageSparqlConnections');
	};

	const handleTestAll = () => {
		for (const connection of connections) {
			handleTestConnection(connection);
		}
	};

	const handleListGraphs = (connection: SparqlConnection) => {
		messaging?.postMessage({ id: 'ListSparqlConnectionGraphs', connection });
	};

	/**
	 * The details text of a row: the graph-loading state, the last load error or
	 * the cached graph count, mirroring the settings list's graph badge.
	 */
	const getDetails = (connection: SparqlConnection): { text: string; title?: string; error?: boolean } | undefined => {
		if (loading[connection.id]) {
			return { text: 'Loading…' };
		}

		const status = statuses[connection.id];

		if (status?.error) {
			return { text: 'Error loading graphs', title: status.error, error: true };
		}

		if (status !== undefined) {
			return { text: `${status.count} ${status.count === 1 ? 'graph' : 'graphs'}` };
		}

		return undefined;
	};

	return (
		<div className="column column-auto">
			<div className="header">
				<h3>Connections</h3>
				<vscode-toolbar-button onClick={handleManageConnections}>
					<span className="muted">Manage</span>
				</vscode-toolbar-button>
				<vscode-toolbar-button onClick={handleTestAll} disabled={connections.length === 0}>
					<span className="muted">Test All</span>
				</vscode-toolbar-button>
			</div>
			<div className="body button-list">
				{connections.length === 0 && <span className="muted">No connections configured.</span>}
				{connections.map(connection => {
					const details = getDetails(connection);
					const testResult = testResults[connection.id];

					return (
						<div key={connection.id} className="history-item">
							{testing[connection.id] ?
								<span className="codicon codicon-sync codicon-modifier-spin" title="Testing connection..."></span> :
								<span
									className={`codicon codicon-arrow-swap${testResult?.success ? ' connection-status-pass' : ''}`}
									title={testResult?.success ? 'Connection test succeeded' : undefined}
								></span>
							}
							<a className="file-link" title={`${connection.endpointUrl} — Edit connection settings`} onClick={() => handleEditConnection(connection)}>
								<span>{connection.endpointUrl}</span>
							</a>
							{details && (
								<span className={`folder muted${details.error ? ' connection-status-error' : ''}`} title={details.title}>
									{details.text}
								</span>
							)}
							{testResult?.success === false && (
								<span className="codicon codicon-error connection-status-error" title={testResult.error}></span>
							)}
							<span className="actions">
								<a className="execute-button codicon codicon-play" role="button" title="New query on this connection"
									onClick={() => handleNewQuery(connection)}>
								</a>
								<a className="codicon codicon-debug-disconnect" role="button" title="Test connection" aria-disabled={testing[connection.id]}
									onClick={() => handleTestConnection(connection)}>
								</a>
								<a className="remove-button codicon codicon-list-unordered" role="button" title="List graphs"
									onClick={() => handleListGraphs(connection)}>
								</a>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
