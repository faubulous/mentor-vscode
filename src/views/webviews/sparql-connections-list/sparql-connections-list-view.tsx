import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useWebviewMessaging, useStylesheet } from '../webview-hooks';
import { SparqlConnectionsListMessages } from './sparql-connections-list-messages';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConnectionsList } from '../settings/components/connections-list';
import { TestResult } from '../settings/components/types';
import stylesheet from './sparql-connections-list-view.css';

interface ConnectionsListState {
	connections: SparqlConnection[];
	isLoading: boolean;
	testingConnections: Set<string>;
	testResults: Record<string, TestResult>;
}

const initialState: ConnectionsListState = {
	connections: [],
	isLoading: true,
	testingConnections: new Set(),
	testResults: {}
};

/**
 * A webview component that displays a list of SPARQL connections grouped by configuration scope.
 */
function SparqlConnectionsListView() {
	const [state, setState] = useState<ConnectionsListState>(initialState);

	// Message handler
	const handleMessage = useCallback((message: SparqlConnectionsListMessages) => {
		switch (message.id) {
			case 'GetConnectionsResult':
			case 'ConnectionsChanged': {
				setState(prev => ({
					...prev,
					connections: message.connections,
					isLoading: false
				}));
				return;
			}
			case 'TestConnectionResult': {
				setState(prev => {
					const newTestingConnections = new Set(prev.testingConnections);
					newTestingConnections.delete(message.connectionId);
					return {
						...prev,
						testingConnections: newTestingConnections,
						testResults: {
							...prev.testResults,
							[message.connectionId]: { success: message.success, error: message.error }
						}
					};
				});
				return;
			}
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlConnectionsListMessages>(handleMessage);

	// Add stylesheet
	useStylesheet('sparql-connections-list-styles', stylesheet);

	// Request connections on mount
	useEffect(() => {
		messaging?.postMessage({ id: 'GetConnections' });
	}, []);

	const handleCreateConnection = () => {
		messaging?.postMessage({ id: 'CreateConnection' });
	};

	const handleEditConnection = (connection: SparqlConnection) => {
		messaging?.postMessage({ id: 'EditConnection', connection });
	};

	const handleDeleteConnection = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		messaging?.postMessage({ id: 'DeleteConnection', connection });
	};

	const handleListGraphs = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		// Set connection to testing state while we verify the connection
		setState(prev => {
			const newTestingConnections = new Set(prev.testingConnections);
			newTestingConnections.add(connection.id);

			const { [connection.id]: _removed, ...rest } = prev.testResults;
			
			return {
				...prev,
				testingConnections: newTestingConnections,
				testResults: rest
			};
		});
		messaging?.postMessage({ id: 'ListGraphs', connection });
	};

	const handleTestConnection = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setState(prev => {
			const newTestingConnections = new Set(prev.testingConnections);
			newTestingConnections.add(connection.id);
			// Clear previous test result
			const { [connection.id]: _removed, ...rest } = prev.testResults;
			return {
				...prev,
				testingConnections: newTestingConnections,
				testResults: rest
			};
		});
		messaging?.postMessage({ id: 'TestConnection', connection });
	};

	const handleTestAllConnections = () => {
		// Get all testable connections (not workspace store)
		const testableConnections = state.connections;

		// Mark all as testing and clear previous results
		setState(prev => {
			const newTestingConnections = new Set(prev.testingConnections);
			const newTestResults = { ...prev.testResults };
			testableConnections.forEach(c => {
				newTestingConnections.add(c.id);
				delete newTestResults[c.id];
			});
			return {
				...prev,
				testingConnections: newTestingConnections,
				testResults: newTestResults
			};
		});

		// Send test message for each connection
		testableConnections.forEach(connection => {
			messaging?.postMessage({ id: 'TestConnection', connection });
		});
	};

	// Check if any connections are being tested

	return (
		<ConnectionsList
			connections={state.connections}
			testResults={state.testResults}
			testingConnections={state.testingConnections}
			onCreateConnection={handleCreateConnection}
			onEditConnection={handleEditConnection}
			onDeleteConnection={(conn) => handleDeleteConnection(conn, { stopPropagation: () => {} } as React.MouseEvent)}
			onTestConnection={handleTestConnection}
			onListGraphs={handleListGraphs}
			onOpenInBrowser={(url) => messaging?.postMessage({ id: 'OpenInBrowser', url })}
		/>
	);
}

export { SparqlConnectionsListView };

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlConnectionsListView />);
