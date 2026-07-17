import * as React from 'react';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConnectionsListItem } from './connections-list-item';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { TestResult } from '../../../settings-types';
import { GraphStatus } from '../connections-list-messages';
import { SettingsList, SettingsListSection } from '../../../components/settings-list';

export interface ConnectionsListProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	graphStatuses: Record<string, GraphStatus>;
	testingConnections: Set<string>;
	loadingGraphs: Set<string>;
	hasWorkspace: boolean;
	onCreateConnection: (scope: ConfigurationScope) => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onListGraphs: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onReloadGraphs: () => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * Lists the configured SPARQL connections via the shared {@link SettingsList},
 * grouped by where they are stored: built-in presets (the workspace store),
 * workspace settings and user settings. The workspace group is omitted when no
 * workspace folder is open. The page header offers Reload/Test-all actions.
 */
export function ConnectionsList({
	connections,
	testResults,
	graphStatuses,
	testingConnections,
	loadingGraphs,
	hasWorkspace,
	onCreateConnection,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onReloadGraphs,
	onOpenInBrowser,
}: ConnectionsListProps) {
	const testableCount = connections.length;

	const presetConnections = connections.filter(c => c.isProtected === true);
	const workspaceConnections = connections.filter(c => c.isProtected !== true && c.configScope === ConfigurationScope.Workspace);
	const userConnections = connections.filter(c => c.isProtected !== true && c.configScope !== ConfigurationScope.Workspace);

	const testAllConnections = () => {
		connections.forEach((c, i) => setTimeout(
			() => onTestConnection(c, { stopPropagation: () => { } } as React.MouseEvent),
			i * 300
		));
	};

	const addAction = (scope: ConfigurationScope) => (
		<vscode-toolbar-button className="primary" title="Create a new connection" onClick={() => onCreateConnection(scope)}>
			<span className="codicon codicon-add" />
			<span className="label">Add Connection</span>
		</vscode-toolbar-button>
	);

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

	const sections: SettingsListSection<SparqlConnection>[] = [
		{
			title: 'Presets',
			description: 'Built-in connections that ship with Mentor. They cannot be edited or removed.',
			items: presetConnections,
			emptyMessage: '',
			hideWhenEmpty: true,
		},
		...(hasWorkspace ? [{
			title: 'Workspace',
			description: 'Connections kept in the workspace settings (.vscode/settings.json), which can be shared via version control.',
			action: addAction(ConfigurationScope.Workspace),
			items: workspaceConnections,
			emptyMessage: 'No workspace connections yet.',
		}] : []),
		{
			title: 'User',
			description: 'Connections kept in your user settings, available in all your workspaces on this machine.',
			action: addAction(ConfigurationScope.User),
			items: userConnections,
			emptyMessage: 'No user connections yet.',
		},
	];

	return (
		<SettingsList<SparqlConnection>
			header={header}
			sections={sections}
			getItemId={connection => connection.id}
			renderItem={(connection, navProps) => (
				<ConnectionsListItem
					connection={connection}
					testResult={testResults[connection.id]}
					graphStatus={graphStatuses[connection.id]}
					isTesting={testingConnections.has(connection.id)}
					isLoadingGraphs={loadingGraphs.has(connection.id)}
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
