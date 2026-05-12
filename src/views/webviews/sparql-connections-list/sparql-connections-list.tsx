import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TestResult } from '../settings/components/types';
import { SparqlConnectionsListItem } from './sparql-connections-list-item';

export interface SparqlConnectionsListProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	testingConnections: Set<string>;
	onCreateConnection: () => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onListGraphs: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onOpenInBrowser: (url: string) => void;
	onMoveConnection?: (connection: SparqlConnection, toScope: ConfigurationScope) => void;
}

export function SparqlConnectionsList({
	connections,
	testResults,
	testingConnections,
	onCreateConnection,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onOpenInBrowser,
	onMoveConnection,
}: SparqlConnectionsListProps) {
	const isTestingAll = testingConnections.size > 0;
	const testableCount = connections.length;

	return (
		<div className="connections-list-container">
			<div className="connections-list-header">
				<h2 className="settings-section-title">Connections</h2>
				<div className="connections-list-header-actions">
					{testableCount > 0 && (
						<vscode-toolbar-button
							className="test-all-button"
							title="Test all connections"
							onClick={() => {
								connections.forEach((c, i) => setTimeout(
									() => onTestConnection(c, { stopPropagation: () => {} } as React.MouseEvent),
									i * 300
								));
							}}
							disabled={isTestingAll}
						>
							<vscode-icon name="debug-disconnect" />
						</vscode-toolbar-button>
					)}
					<vscode-button title="Create a new connection" onClick={onCreateConnection}>
						<vscode-icon name="add" slot="start" />
						Add Connection
					</vscode-button>
				</div>
			</div>

			{connections.length === 0 ? (
				<div className="empty-state">
					<vscode-icon name="database" />
					<p>No SPARQL connections configured yet.</p>
					<button className="connection-add-link" onClick={onCreateConnection}>
						<vscode-icon name="add" />
						Create your first connection
					</button>
				</div>
			) : (
				<div className="connections-list">
					{connections.map(connection => (
						<SparqlConnectionsListItem
							key={connection.id}
							connection={connection}
							testResult={testResults[connection.id]}
							isTesting={testingConnections.has(connection.id)}
							onEditConnection={onEditConnection}
							onDeleteConnection={onDeleteConnection}
							onTestConnection={onTestConnection}
							onListGraphs={onListGraphs}
							onOpenInBrowser={onOpenInBrowser}
							onMoveConnection={onMoveConnection}
						/>
					))}
				</div>
			)}
		</div>
	);
}
