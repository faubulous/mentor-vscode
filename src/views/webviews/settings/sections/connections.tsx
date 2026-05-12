import * as React from 'react';
import { useState, useEffect, useContext } from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TestResult } from '../components/types';
import { SparqlConnectionsList } from '../../sparql-connections-list/sparql-connections-list';
import { SettingsScopeContext } from '../components/setting-row';

export interface ConnectionsSectionProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	onCreateConnection: () => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection) => void;
	onListGraphs: (connection: SparqlConnection) => void;
	onOpenInBrowser: (url: string) => void;
	onMoveConnection?: (connection: SparqlConnection, toScope: ConfigurationScope) => void;
}

export function ConnectionsSection({
	connections,
	testResults,
	onCreateConnection,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onOpenInBrowser,
	onMoveConnection,
}: ConnectionsSectionProps) {
	const activeScope = useContext(SettingsScopeContext);
	// Track which connections are currently being tested/listed
	const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());

	// When a test result arrives for a connection that was testing, clear it from the testing set
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

	const scopeEnum = activeScope === 'user' ? ConfigurationScope.User : ConfigurationScope.Workspace;
	const filtered = connections.filter(c => c.configScope === scopeEnum || c.isProtected === true);

	const handleTestConnection = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingConnections(prev => new Set(prev).add(connection.id));
		onTestConnection(connection);
	};

	const handleListGraphs = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingConnections(prev => new Set(prev).add(connection.id));
		onListGraphs(connection);
	};

	return (
		<SparqlConnectionsList
			connections={filtered}
			testResults={testResults}
			testingConnections={testingConnections}
			onCreateConnection={onCreateConnection}
			onEditConnection={onEditConnection}
			onDeleteConnection={onDeleteConnection}
			onTestConnection={handleTestConnection}
			onListGraphs={handleListGraphs}
			onOpenInBrowser={onOpenInBrowser}
			onMoveConnection={onMoveConnection}
		/>
	);
}
