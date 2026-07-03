import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConnectionsListItem } from './connections-list-item';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { TestResult } from '../../settings-types';
import { GraphStatus } from './connections-list-messages';
import { useListKeyboardNavigation } from '../../components/use-list-keyboard-navigation';

export interface ConnectionsListProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	graphStatuses: Record<string, GraphStatus>;
	testingConnections: Set<string>;
	onCreateConnection: () => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onListGraphs: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onReloadGraphs: () => void;
	onOpenInBrowser: (url: string) => void;
}

export function ConnectionsList({
	connections,
	testResults,
	graphStatuses,
	testingConnections,
	onCreateConnection,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onReloadGraphs,
	onOpenInBrowser,
}: ConnectionsListProps) {
	const testableCount = connections.length;

	const protectedConnections = connections.filter(c => c.isProtected === true);
	const userDefinedConnections = connections.filter(c => c.isProtected !== true);

	// Navigation spans both subsections in visual (top-to-bottom) order.
	const orderedConnections = [...protectedConnections, ...userDefinedConnections];
	const { getItemProps } = useListKeyboardNavigation(
		orderedConnections.map(c => c.id),
		{ onActivate: id => { const found = connections.find(c => c.id === id); if (found) { onEditConnection(found); } } }
	);

	const renderItem = (connection: SparqlConnection) => (
		<ConnectionsListItem
			key={connection.id}
			connection={connection}
			testResult={testResults[connection.id]}
			graphStatus={graphStatuses[connection.id]}
			isTesting={testingConnections.has(connection.id)}
			navProps={getItemProps(connection.id)}
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
			<SectionHeader
				title="Connections"
				variant="title"
				actions={
					<>
						{testableCount > 0 && (
							<>
								<vscode-toolbar-button className="primary" title="Reload graphs for all connections" onClick={onReloadGraphs}>
									<span className="codicon codicon-refresh" />
									<span className="label">Reload Graphs</span>
								</vscode-toolbar-button>
								<vscode-toolbar-button className="primary" title="Test all connections" onClick={testAllConnections}>
									<span className="codicon codicon-debug-disconnect" />
									<span className="label">Test Connections</span>
								</vscode-toolbar-button>
							</>
						)}
					</>
				}
			/>

			{protectedConnections.length > 0 && (
				<section className="connections-subsection">
					<SectionHeader
						title="Protected"
						description="Mentor built-in connections that cannot be removed."
					/>
					<div className="connections-list">
						{protectedConnections.map(renderItem)}
					</div>
				</section>
			)}

			<section className="connections-subsection">
				<SectionHeader
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
