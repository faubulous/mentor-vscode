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
}

const initialState: ConnectionsListState = {
	connections: [],
	isLoading: true
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
				setState({
					connections: message.connections,
					isLoading: false
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

	const renderConnection = (connection: SparqlConnection) => {
		const isProtected = connection.isProtected === true;
		const isWorkspaceStore = connection.id === 'workspace';

		return (
			<div
				key={connection.id}
				className="connection-item"
				onClick={() => handleEditConnection(connection)}
				title={isWorkspaceStore ? 'Edit workspace store settings' : `Edit ${connection.endpointUrl}`}
			>
				<vscode-icon name='database' className="connection-item-icon" />
				<div className="connection-item-content">
					<span className="connection-item-url">
						{isWorkspaceStore ? 'workspace:' : connection.endpointUrl}
					</span>
				</div>
				{isProtected ? (
					<vscode-icon name="lock" className="connection-item-lock" title="Built-in connection" />
				) : (
					<div className="connection-item-actions">
						<vscode-toolbar-button
							title="Delete connection"
							onClick={(e: React.MouseEvent) => handleDeleteConnection(connection, e)}
						>
							<vscode-icon name="trash" />
						</vscode-toolbar-button>
					</div>
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
				<vscode-button className="add-button" title="Add new connection" onClick={handleCreateConnection}>
					<vscode-icon name="add" />
				</vscode-button>
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
