import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { Badge } from '@src/views/webviews/components/badge';
import { TestResult } from '../../../settings-types';
import { GraphStatus } from '../connections-list-messages';
import { ListItemNavProps } from '../../../hooks/use-list-keyboard-navigation';
import { SettingsListItem } from '../../../components/settings-list-item';

export interface ConnectionsListItemProps {
	connection: SparqlConnection;
	testResult?: TestResult;
	graphStatus?: GraphStatus;
	isTesting: boolean;
	isLoadingGraphs: boolean;
	navProps?: ListItemNavProps;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onListGraphs: (connection: SparqlConnection, e: React.MouseEvent) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * A single row in the SPARQL connections list. A field-mapper over
 * {@link SettingsListItem} that additionally reflects live test/graph status via
 * the leading icon, a row status class, and a meta subline.
 */
export function ConnectionsListItem({
	connection,
	testResult,
	graphStatus,
	isTesting,
	isLoadingGraphs,
	navProps,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onOpenInBrowser
}: ConnectionsListItemProps) {
	const isProtected = connection.isProtected === true;
	const isWorkspaceStore = connection.id === 'workspace';

	// Loading graphs renders the row busy in the same way as testing the connection.
	const isBusy = isTesting || isLoadingGraphs;

	// A successful test tints the connection icon green rather than swapping it
	// for a checkmark, so the row keeps its identity.
	const connectionIcon = isBusy
		? <vscode-icon name="ellipsis" className="settings-item-icon icon-testing" />
		: testResult?.success === true
			? <vscode-icon name="arrow-swap" className="settings-item-icon icon-success" title="Connection test succeeded" />
			: testResult?.success === false
				? <vscode-icon name="arrow-swap" className="settings-item-icon icon-error" title={testResult.error} />
				: <vscode-icon name="arrow-swap" className="settings-item-icon" />;

	const testTitle = isTesting
		? 'Testing connection...'
		: testResult?.success === true
			? 'Connection successful'
			: testResult?.success === false
				? `Connection failed: ${testResult.error}`
				: 'Test connection';

	let statusClass = '';

	if (isBusy) {
		statusClass = 'testing';
	} else if (testResult?.success === true) {
		statusClass = 'test-success';
	} else if (testResult?.success === false) {
		statusClass = 'test-error';
	}

	const metaItems: React.ReactNode[] = [];

	if (connection.description) {
		metaItems.push(
			<span key="description" className="settings-item-meta-item settings-item-meta-description">
				{connection.description}
			</span>
		);
	}

	if (connection.canToggleInference) {
		metaItems.push(
			<span key="inference" className="settings-item-meta-item">
				Inference Supported
			</span>
		);
	}

	const actions = (
		<>
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
			{!isWorkspaceStore && (
				<vscode-toolbar-button
					title={testTitle}
					onClick={(e: React.MouseEvent) => onTestConnection(connection, e)}
					disabled={isTesting}
				>
					<vscode-icon name="debug-disconnect" />
				</vscode-toolbar-button>
			)}
			{!isProtected && (
				<vscode-toolbar-button
					title="Delete connection"
					onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteConnection(connection); }}
				>
					<vscode-icon name="trash" />
				</vscode-toolbar-button>
			)}
		</>
	);

	// The badge slot shows the live graph state: a loading indicator while the
	// graphs are being (re-)loaded, the load error when one occurred, or the
	// graph count when known. The storage scope is communicated by the list
	// section, which this badge replaced.
	const graphBadge = isLoadingGraphs
		? (
			<Badge className="badge-busy" title="Loading graphs from this connection...">
				Loading...
			</Badge>
		)
		: graphStatus?.error
			? (
				<Badge className="badge-error" title={graphStatus.error}>
					Error loading graphs
				</Badge>
			)
			: graphStatus?.count !== undefined
				? (
					<Badge title="Number of graphs on this connection">
						{graphStatus.count} {graphStatus.count === 1 ? 'graph' : 'graphs'}
					</Badge>
				)
				: null;

	const subline = metaItems.length > 0
		? (
			<div className="settings-item-meta">
				{metaItems.map((item, index) => (
					<React.Fragment key={index}>
						{item}
					</React.Fragment>
				))}
			</div>
		)
		: null;

	return (
		<SettingsListItem
			icon={connectionIcon}
			name={connection.endpointUrl}
			tooltip={isWorkspaceStore ? 'Edit workspace store settings' : `Edit ${connection.endpointUrl}`}
			actions={actions}
			subline={subline}
			badge={graphBadge}
			locked={isProtected}
			lockTitle="Built-in connection"
			className={statusClass || undefined}
			keyboardNavProps={navProps}
			onClick={() => onEditConnection(connection)}
		/>
	);
}
