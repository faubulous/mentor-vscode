import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useWebviewMessaging, useStylesheet } from '../webview-hooks';
import { SparqlConnectionsListMessages } from './sparql-connections-list-messages';
import { SparqlConnection } from '@src/services/sparql-connection';
import { ConfigurationScope, getConfigurationScopeLabel, getConfigurationScopeDescription } from '@src/utilities/config-scope';
import stylesheet from './sparql-connections-list-view.css';

import '@vscode-elements/elements/dist/vscode-button';
import '@vscode-elements/elements/dist/vscode-icon';
import '@vscode-elements/elements/dist/vscode-toolbar-button';

interface ConnectionsListState {
	connections: SparqlConnection[];
	isLoading: boolean;
	testingConnections: Set<string>;
	testResults: Map<string, { success: boolean; error?: string }>;
}

const initialState: ConnectionsListState = {
	connections: [],
	isLoading: true,
	testingConnections: new Set(),
	testResults: new Map()
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
					const newTestResults = new Map(prev.testResults);
					newTestResults.set(message.connectionId, { success: message.success, error: message.error });
					return {
						...prev,
						testingConnections: newTestingConnections,
						testResults: newTestResults
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

	// Group connections by scope
	const userConnections = state.connections.filter(c => c.configScope === ConfigurationScope.User);
	const workspaceConnections = state.connections.filter(c => c.configScope === ConfigurationScope.Workspace);

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
			const newTestResults = new Map(prev.testResults);
			newTestResults.delete(connection.id);
			return {
				...prev,
				testingConnections: newTestingConnections,
				testResults: newTestResults
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
			const newTestResults = new Map(prev.testResults);
			newTestResults.delete(connection.id);
			return {
				...prev,
				testingConnections: newTestingConnections,
				testResults: newTestResults
			};
		});
		messaging?.postMessage({ id: 'TestConnection', connection });
	};

	const handleTestAllConnections = () => {
		// Get all testable connections (not workspace store)
		const testableConnections = state.connections.filter(c => c.id !== 'workspace');
		
		// Mark all as testing and clear previous results
		setState(prev => {
			const newTestingConnections = new Set(prev.testingConnections);
			const newTestResults = new Map(prev.testResults);
			testableConnections.forEach(c => {
				newTestingConnections.add(c.id);
				newTestResults.delete(c.id);
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
	const isTestingAll = state.testingConnections.size > 0;
	const testableConnectionsCount = state.connections.filter(c => c.id !== 'workspace').length;

	const renderConnection = (connection: SparqlConnection) => {
		const isProtected = connection.isProtected === true;
		const isWorkspaceStore = connection.id === 'workspace';
		const isTesting = state.testingConnections.has(connection.id);
		const testResult = state.testResults.get(connection.id);

		const getConnectionIcon = () => {
			if (isWorkspaceStore) {
				return <vscode-icon name="database" className="connection-item-icon" />;
			}
			if (isTesting) {
				return <vscode-icon name="ellipsis" className="connection-item-icon icon-testing" />;
			}
			if (testResult?.success) {
				return <vscode-icon name="pass" className="connection-item-icon icon-success" />;
			}
			if (testResult && !testResult.success) {
				return <vscode-icon name="error" className="connection-item-icon icon-error" title={testResult.error} />;
			}
			return <vscode-icon name="database" className="connection-item-icon" />;
		};

		const getTestTitle = () => {
			if (isTesting) return 'Testing connection...';
			if (testResult) {
				return testResult.success ? 'Connection successful' : `Connection failed: ${testResult.error}`;
			}
			return 'Test connection';
		};

		const getConnectionItemClass = () => {
			let className = 'connection-item';
			if (isTesting) className += ' testing';
			else if (testResult?.success) className += ' test-success';
			else if (testResult && !testResult.success) className += ' test-error';
			return className;
		};

		return (
			<div
				key={connection.id}
				className={getConnectionItemClass()}
				onClick={() => handleEditConnection(connection)}
				title={isWorkspaceStore ? 'Edit workspace store settings' : `Edit ${connection.endpointUrl}`}
			>
				{getConnectionIcon()}
				<div className="connection-item-content">
					<span className="connection-item-url">
						{isWorkspaceStore ? 'workspace:' : connection.endpointUrl}
					</span>
				</div>
				<div className="connection-item-actions">
					<vscode-toolbar-button
						title="List graphs"
						onClick={(e: React.MouseEvent) => handleListGraphs(connection, e)}
					>
						<vscode-icon name="list-unordered" />
					</vscode-toolbar-button>
					{!isWorkspaceStore && (
						<vscode-toolbar-button
							title={getTestTitle()}
							onClick={(e: React.MouseEvent) => handleTestConnection(connection, e)}
							disabled={isTesting}
						>
							<vscode-icon name="debug-disconnect" />
						</vscode-toolbar-button>
					)}
					{!isProtected && (
						<vscode-toolbar-button
							title="Delete connection"
							onClick={(e: React.MouseEvent) => handleDeleteConnection(connection, e)}
						>
							<vscode-icon name="trash" />
						</vscode-toolbar-button>
					)}
				</div>
				{isProtected && (
					<vscode-icon name="lock" className="connection-item-lock" title="Built-in connection" />
				)}
			</div>
		);
	};

	const renderConnectionsSection = (
		connections: SparqlConnection[],
		scope: ConfigurationScope
	) => {
		if (connections.length === 0) {
			return null;
		}

		return (
			<div className="connections-scope-section">
				<div className="connections-scope-header">
					<span className="connections-scope-title">{getConfigurationScopeLabel(scope)}</span>
					<span className="connections-scope-description">{getConfigurationScopeDescription(scope)}</span>
				</div>
				<div className="connections-list">
					{connections.map(renderConnection)}
				</div>
			</div>
		);
	};

	const hasConnections = state.connections.length > 0;

	return (
		<div className="connections-list-container">
			<div className="connections-list-header">
				<h2>Manage Connections</h2>
				<div className="connections-list-header-actions">
					{testableConnectionsCount > 0 && (
						<vscode-toolbar-button 
							className="test-all-button" 
							title="Test all connections" 
							onClick={handleTestAllConnections}
							disabled={isTestingAll}
							secondary
						>
							<vscode-icon name="debug-disconnect" slot="start" />
							Test All
						</vscode-toolbar-button>
					)}
					<vscode-button className="add-button" title="Add new connection" onClick={handleCreateConnection}>
						<vscode-icon name="add" />
					</vscode-button>
				</div>
			</div>

			{state.isLoading ? (
				<div className="empty-state">
					<p>Loading connections...</p>
				</div>
			) : !hasConnections ? (
				<div className="empty-state">
					<vscode-icon name="database" />
					<p>No SPARQL connections configured yet.</p>
					<vscode-button onClick={handleCreateConnection}>
						<vscode-icon name="add" slot="start" />
						Create your first connection
					</vscode-button>
				</div>
			) : (
				<>
					{renderConnectionsSection(workspaceConnections, ConfigurationScope.Workspace)}
					{renderConnectionsSection(userConnections, ConfigurationScope.User)}
				</>
			)}
		</div>
	);
}

export { SparqlConnectionsListView };

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlConnectionsListView />);
