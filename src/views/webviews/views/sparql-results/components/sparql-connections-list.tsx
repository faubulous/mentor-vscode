import { Fragment, useState, useEffect, useCallback } from 'react';
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
 * The graph-loading details of a connection: its loading state, the last load error or the
 * number of graphs cached for it.
 */
interface GraphDetails {
	/**
	 * The visible summary text.
	 */
	text: string;

	/**
	 * The full message, shown as a tooltip when {@link text} only summarises it.
	 */
	title?: string;

	/**
	 * Whether the details report a failure and should be rendered in the error colour.
	 */
	error?: boolean;
}

/**
 * One segment of a row's details text. Segments are rendered in order, separated by a
 * middle dot.
 */
interface DetailSegment extends GraphDetails {
	/**
	 * Stable React key of the segment.
	 */
	key: string;
}

/**
 * Get the status modifier class for a connection's leading icon, tinting it green or red to
 * report the outcome of the last endpoint test.
 * @param testResult The outcome of the last endpoint test, if the connection was tested.
 * @returns A space-prefixed class name to append, or an empty string for an untested connection.
 */
function getConnectionStatusClass(testResult: TestResult | undefined): string {
	if (testResult === undefined) {
		return '';
	}

	return testResult.success ? ' connection-status-pass' : ' connection-status-error';
}

/**
 * Get the tooltip of a connection's leading icon. A failed test reports its error here, so
 * the message stays reachable from the tinted icon itself.
 * @param testResult The outcome of the last endpoint test, if the connection was tested.
 * @returns The outcome of the test, or `undefined` for an untested connection.
 */
function getConnectionStatusTooltip(testResult: TestResult | undefined): string | undefined {
	if (testResult === undefined) {
		return undefined;
	}

	if (testResult.success) {
		return 'Connection test succeeded';
	}

	return testResult.error ? `Connection test failed: ${testResult.error}` : 'Connection test failed';
}

/**
 * Get the label reporting the outcome of a connection's last endpoint test, shown ahead of
 * the graph count in the row's details text.
 * @param testResult The outcome of the last endpoint test, if the connection was tested.
 * @returns The status label, or `undefined` for an untested connection.
 */
function getConnectionStatusLabel(testResult: TestResult | undefined): string | undefined {
	if (testResult === undefined) {
		return undefined;
	}

	return testResult.success ? 'Connected' : 'Connection failed';
}

/**
 * Get the details segments of a connection row, in display order: the outcome of the last
 * endpoint test, followed by its graph-loading state, load error or cached graph count.
 * @param testResult The outcome of the last endpoint test, if the connection was tested.
 * @param graphDetails The graph-loading details of the connection, if any are known.
 * @returns The segments to render, which may be empty for an untested connection whose
 * graphs have never been listed.
 */
function getDetailSegments(testResult: TestResult | undefined, graphDetails: GraphDetails | undefined): DetailSegment[] {
	const segments: DetailSegment[] = [];
	const statusLabel = getConnectionStatusLabel(testResult);

	if (statusLabel !== undefined) {
		segments.push({ key: 'status', text: statusLabel, title: getConnectionStatusTooltip(testResult) });
	}

	if (graphDetails !== undefined) {
		segments.push({ key: 'graphs', ...graphDetails });
	}

	return segments;
}

/**
 * The Connections column of the SPARQL results welcome view: lists all
 * connections in the query-history look. Each row leads with a connection icon
 * tinted by the outcome of its last endpoint test, and carries that outcome and
 * the cached graph count as dot-separated details text, followed by new-query /
 * test / list-graphs context buttons. The header offers a Manage button that
 * opens the Query > Connections settings section.
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
	const getDetails = (connection: SparqlConnection): GraphDetails | undefined => {
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
					const testResult = testResults[connection.id];
					const segments = getDetailSegments(testResult, getDetails(connection));

					return (
						<div key={connection.id} className="history-item">
							{testing[connection.id] ?
								<span className="codicon codicon-sync codicon-modifier-spin" title="Testing connection..."></span> :
								<span
									className={`codicon codicon-arrow-swap${getConnectionStatusClass(testResult)}`}
									title={getConnectionStatusTooltip(testResult)}
								></span>
							}
							<a className="file-link" title={`${connection.endpointUrl} — Edit connection settings`} onClick={() => handleEditConnection(connection)}>
								<span>{connection.endpointUrl}</span>
							</a>
							{segments.length > 0 && (
								<span className="folder muted">
									{segments.map((segment, index) => (
										<Fragment key={segment.key}>
											{index > 0 && <span className="detail-separator" aria-hidden="true">{' · '}</span>}
											<span className={segment.error ? 'connection-status-error' : undefined} title={segment.title}>
												{segment.text}
											</span>
										</Fragment>
									))}
								</span>
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
