import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConnectionsListItem } from './connections-list-item';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { TestResult } from '../../settings-types';

export interface ConnectionsListProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	testingConnections: Set<string>;
	onCreateConnection: () => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onListGraphs: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onOpenInBrowser: (url: string) => void;
}

export function ConnectionsList({
	connections,
	testResults,
	testingConnections,
	onCreateConnection,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onOpenInBrowser,
}: ConnectionsListProps) {
	const testableCount = connections.length;

	const protectedConnections = connections.filter(c => c.isProtected === true);
	const userDefinedConnections = connections.filter(c => c.isProtected !== true);

	const renderItem = (connection: SparqlConnection) => (
		<ConnectionsListItem
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

	const testAllConnections = () => {
		connections.forEach((c, i) => setTimeout(
			() => onTestConnection(c, { stopPropagation: () => { } } as React.MouseEvent),
			i * 300
		));
	};

	return (
		<div className="connections-list-container">
			<FormSectionHeader
				title="Connections"
				large
				actions={
					<>
						{testableCount > 0 && (
							<vscode-toolbar-button className="primary" title="Test all connections" onClick={testAllConnections}>
								<span className="codicon codicon-debug-disconnect" />
								<span className="label">Test Connections</span>
							</vscode-toolbar-button>
						)}
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
					description="SPARQL endpoints you have configured." actions={
						<>
							<vscode-toolbar-button className="primary" title="Create a new connection" onClick={onCreateConnection}>
								<span className="codicon codicon-add" />
								<span className="label">Add Connection</span>
							</vscode-toolbar-button>
						</>
					} />
				{userDefinedConnections.length === 0 ? (
					<p className="connections-empty-message">No user-defined connections yet.</p>
				) : (
					<div className="connections-list">
						{userDefinedConnections.map(renderItem)}
					</div>
				)}
			</section>
		</div>
	);
}
