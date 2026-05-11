import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TestResult } from './types';

import '@vscode-elements/elements/dist/vscode-button';
import '@vscode-elements/elements/dist/vscode-icon';
import '@vscode-elements/elements/dist/vscode-toolbar-button';

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
	onMoveConnection?: (connection: SparqlConnection, toScope: ConfigurationScope) => void;
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
	onMoveConnection,
}: ConnectionsListProps) {
	const isTestingAll = testingConnections.size > 0;
	const testableCount = connections.length;

	const renderConnection = (connection: SparqlConnection) => {
		const isProtected = connection.isProtected === true;
		const isWorkspaceStore = connection.id === 'workspace';
		const isTesting = testingConnections.has(connection.id);
		const testResult = testResults[connection.id];

		const connectionIcon = isTesting
			? <vscode-icon name="ellipsis" className="connection-item-icon icon-testing" />
			: testResult?.success === true
			? <vscode-icon name="pass" className="connection-item-icon icon-success" />
			: testResult?.success === false
			? <vscode-icon name="error" className="connection-item-icon icon-error" title={testResult.error} />
			: <vscode-icon name="database" className="connection-item-icon" />;

		const testTitle = isTesting
			? 'Testing connection...'
			: testResult?.success === true
			? 'Connection successful'
			: testResult?.success === false
			? `Connection failed: ${testResult.error}`
			: 'Test connection';

		let itemClass = 'connection-item';
		if (isTesting) itemClass += ' testing';
		else if (testResult?.success === true) itemClass += ' test-success';
		else if (testResult?.success === false) itemClass += ' test-error';

		const otherScope = connection.configScope === ConfigurationScope.User
			? ConfigurationScope.Workspace
			: ConfigurationScope.User;
		const otherScopeLabel = connection.configScope === ConfigurationScope.User ? 'Workspace' : 'User';

		return (
			<div
				key={connection.id}
				className={itemClass}
				onClick={() => !isProtected && onEditConnection(connection)}
				title={isWorkspaceStore ? 'Edit workspace store settings' : `Edit ${connection.endpointUrl}`}
			>
				{connectionIcon}
				<div className="connection-item-content">
					<span className="connection-item-name">{connection.endpointUrl}</span>
					{connection.description && (
						<span className="connection-item-description">{connection.description}</span>
					)}
				</div>
				<div className="connection-item-actions" onClick={e => e.stopPropagation()}>
					{!isProtected && onMoveConnection && (
						<vscode-toolbar-button
							title={`Move to ${otherScopeLabel} Scope`}
							onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMoveConnection(connection, otherScope); }}
						>
							<vscode-icon name="arrow-swap" />
						</vscode-toolbar-button>
					)}
					{!isWorkspaceStore && (
						<vscode-toolbar-button
							title="Open in browser"
							onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenInBrowser(connection.endpointUrl); }}
						>
							<vscode-icon name="link-external" />
						</vscode-toolbar-button>
					)}
					<vscode-toolbar-button
						title="List graphs"
						onClick={(e: React.MouseEvent) => onListGraphs(connection, e)}
					>
						<vscode-icon name="list-unordered" />
					</vscode-toolbar-button>
					<vscode-toolbar-button
						title={testTitle}
						onClick={(e: React.MouseEvent) => onTestConnection(connection, e)}
						disabled={isTesting}
					>
						<vscode-icon name="debug-disconnect" />
					</vscode-toolbar-button>
					{!isProtected && (
						<vscode-toolbar-button
							title="Delete connection"
							onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteConnection(connection); }}
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
				<>
					<div className="connections-list">
						{connections.map(renderConnection)}
					</div>
				</>
			)}
		</div>
	);
}
