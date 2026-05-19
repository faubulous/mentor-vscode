import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TestResult } from '../settings/components/types';
import { SparqlConnectionsListItem } from './sparql-connections-list-item';
import { FormSectionHeader } from '../components/form-section-header';

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
	onChangeSparqlConnectionScope?: (connection: SparqlConnection, toScope: ConfigurationScope) => void;
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
	onChangeSparqlConnectionScope,
}: SparqlConnectionsListProps) {
	const isTestingAll = testingConnections.size > 0;
	const testableCount = connections.length;

	const protectedConnections = connections.filter(c => c.isProtected === true);
	const userDefinedConnections = connections.filter(c => c.isProtected !== true);

	const renderItem = (connection: SparqlConnection) => (
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
		/>
	);

	return (
		<div className="connections-list-container">
			<FormSectionHeader
				title="Connections"
				large
				actions={
					<>
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
						<button className="connection-add-link" title="Create a new connection" onClick={onCreateConnection}>
							<vscode-icon name="add" />
							Add Connection
						</button>
					</>
				}
			/>

			{protectedConnections.length > 0 && (
				<section className="connections-subsection">
					<FormSectionHeader
						title="Protected"
						description="Mentor built-in connections that cannot be removed."
					/>
					<div className="connections-list">
						{protectedConnections.map(renderItem)}
					</div>
				</section>
			)}

			<section className="connections-subsection">
				<FormSectionHeader
					title="User Defined"
					description="SPARQL endpoints you have configured for this scope."
				/>
				{userDefinedConnections.length === 0 ? (
					<p className="connections-empty-message">No user-defined connections in this scope. Use <strong>Add Connection</strong> above to create one.</p>
				) : (
					<div className="connections-list">
						{userDefinedConnections.map(renderItem)}
					</div>
				)}
			</section>
		</div>
	);
}
