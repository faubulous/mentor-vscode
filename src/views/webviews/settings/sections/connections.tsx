import * as React from 'react';
import { useState, useEffect, useCallback, useContext } from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TestResult } from '../components/types';
import { SparqlConnectionsList } from '../../sparql-connections-list/sparql-connections-list';
import { SparqlConnectionEditor } from '../../sparql-connection/sparql-connection-editor';
import { SettingsScopeContext } from '../components/setting-context';
import { useScopedWebviewMessaging } from '../../webview-hooks';
import { SparqlConnectionsListMessages } from '../../sparql-connections-list/sparql-connections-list-messages';
import { SparqlConnectionMessages } from '../../sparql-connection/sparql-connection-messages';

type ConnectionsSectionMessage = SparqlConnectionsListMessages | SparqlConnectionMessages;

export function ConnectionsSection() {
	const activeScope = useContext(SettingsScopeContext);

	const [connections, setConnections] = useState<SparqlConnection[]>([]);
	const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
	const [editingConnection, setEditingConnection] = useState<SparqlConnection | undefined>(undefined);
	const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());

	const handleMessage = useCallback((message: ConnectionsSectionMessage) => {
		switch (message.id) {
			case 'GetConnectionsResult':
			case 'ConnectionsChanged':
				setConnections(message.connections);
				return;
			case 'TestConnectionResult':
				setTestResults(prev => ({
					...prev,
					[message.connectionId]: message.success
						? { success: true }
						: { success: false, error: message.error },
				}));
				return;
			case 'EditSparqlConnection':
				setEditingConnection(message.connection);
				return;
		}
	}, []);

	const messaging = useScopedWebviewMessaging<ConnectionsSectionMessage>('connections', handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetConnections' });
	}, []);

	useEffect(() => {
		setTestingConnections(prev => {
			const updated = new Set(prev);
			for (const id of prev) {
				if (testResults[id] !== null && testResults[id] !== undefined) {
					updated.delete(id);
				}
			}
			return updated.size === prev.size ? prev : updated;
		});
	}, [testResults]);

	useEffect(() => {
		if (!editingConnection) return;
		const newScope = activeScope === 'user' ? ConfigurationScope.User : ConfigurationScope.Workspace;
		if (editingConnection.configScope === newScope) return;
		setEditingConnection(prev => prev ? { ...prev, configScope: newScope } : prev);
	}, [activeScope]);

	if (editingConnection) {
		return (
			<SparqlConnectionEditor
				connection={editingConnection}
				onBack={() => setEditingConnection(undefined)}
			/>
		);
	}

	const scopeEnum = activeScope === 'user' ? ConfigurationScope.User : ConfigurationScope.Workspace;
	const filtered = connections.filter(c => c.configScope === scopeEnum || c.isProtected === true);

	const handleTestConnection = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingConnections(prev => new Set(prev).add(connection.id));
		messaging?.postMessage({ id: 'TestConnection', connection });
	};

	const handleListGraphs = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingConnections(prev => new Set(prev).add(connection.id));
		messaging?.postMessage({ id: 'ListGraphs', connection });
	};

	return (
		<SparqlConnectionsList
			connections={filtered}
			testResults={testResults}
			testingConnections={testingConnections}
			onCreateConnection={() => messaging?.postMessage({ id: 'CreateConnection' })}
			onEditConnection={(connection) => setEditingConnection(connection)}
			onDeleteConnection={(connection) => messaging?.postMessage({ id: 'DeleteConnection', connection })}
			onTestConnection={handleTestConnection}
			onListGraphs={handleListGraphs}
			onOpenInBrowser={(url) => messaging?.postMessage({ id: 'OpenInBrowser', url })}
			onChangeSparqlConnectionScope={(connection, toScope) => messaging?.postMessage({ id: 'ChangeSparqlConnectionScope', connection, toScope })}
		/>
	);
}
