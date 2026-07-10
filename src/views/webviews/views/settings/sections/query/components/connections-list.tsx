import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConnectionsListItem } from './connections-list-item';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { TestResult } from '../../../settings-types';
import { GraphStatus } from '../connections-list-messages';
import { SettingsList } from '../../../components/settings-list';

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

/**
 * Lists the configured SPARQL connections via the shared {@link SettingsList}: a
 * page-level header with Reload/Test-all actions, a "Protected" group for built-in
 * connections (hidden when empty), and a "User Defined" group with an Add action.
 */
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

	const testAllConnections = () => {
		connections.forEach((c, i) => setTimeout(
			() => onTestConnection(c, { stopPropagation: () => { } } as React.MouseEvent),
			i * 300
		));
	};

	const header = (
		<SectionHeader
			title="Connections"
			variant="title"
			actions={testableCount > 0 ? (
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
			) : undefined}
		/>
	);

	return (
		<SettingsList<SparqlConnection>
			header={header}
			sections={[
				{
					title: 'Protected',
					description: 'Mentor built-in connections that cannot be removed.',
					items: protectedConnections,
					emptyMessage: '',
					hideWhenEmpty: true,
				},
				{
					title: 'User Defined',
					description: 'SPARQL endpoints you have configured.',
					action: (
						<vscode-toolbar-button className="primary" title="Create a new connection" onClick={onCreateConnection}>
							<span className="codicon codicon-add" />
							<span className="label">Add Connection</span>
						</vscode-toolbar-button>
					),
					items: userDefinedConnections,
					emptyMessage: 'No user-defined connections yet.',
				},
			]}
			getItemId={connection => connection.id}
			renderItem={(connection, navProps) => (
				<ConnectionsListItem
					connection={connection}
					testResult={testResults[connection.id]}
					graphStatus={graphStatuses[connection.id]}
					isTesting={testingConnections.has(connection.id)}
					navProps={navProps}
					onEditConnection={onEditConnection}
					onDeleteConnection={onDeleteConnection}
					onTestConnection={onTestConnection}
					onListGraphs={onListGraphs}
					onOpenInBrowser={onOpenInBrowser}
				/>
			)}
			onActivate={onEditConnection}
		/>
	);
}
