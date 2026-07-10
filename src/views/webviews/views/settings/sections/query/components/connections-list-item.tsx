import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ScopeBadge } from '@src/views/webviews/components/scope-badge';
import { TestResult } from '../../../settings-types';
import { GraphStatus } from '../connections-list-messages';
import { ListItemNavProps } from '../../../hooks/use-list-keyboard-navigation';
import { SettingsListItem } from '../../../components/settings-list-item';

export interface ConnectionsListItemProps {
	connection: SparqlConnection;
	testResult?: TestResult;
	graphStatus?: GraphStatus;
	isTesting: boolean;
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
	navProps,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onOpenInBrowser
}: ConnectionsListItemProps) {
	const isProtected = connection.isProtected === true;
	const isWorkspaceStore = connection.id === 'workspace';

	const connectionIcon = isTesting
		? <vscode-icon name="ellipsis" className="settings-item-icon icon-testing" />
		: testResult?.success === true
			? <vscode-icon name="pass" className="settings-item-icon icon-success" />
			: testResult?.success === false
				? <vscode-icon name="error" className="settings-item-icon icon-error" title={testResult.error} />
				: <vscode-icon name="arrow-swap" className="settings-item-icon" />;

	const testTitle = isTesting
		? 'Testing connection...'
		: testResult?.success === true
			? 'Connection successful'
			: testResult?.success === false
				? `Connection failed: ${testResult.error}`
				: 'Test connection';

	let statusClass = '';

	if (isTesting) {
		statusClass = 'testing';
	} else if (testResult?.success === true) {
		statusClass = 'test-success';
	} else if (testResult?.success === false) {
		statusClass = 'test-error';
	}

	const showGraphCount = graphStatus?.count !== undefined && (connection.autoLoadGraphs || isWorkspaceStore);
	const metaItems: React.ReactNode[] = [];

	if (connection.description) {
		metaItems.push(
			<span key="description" className="settings-item-meta-item settings-item-meta-description">
				{connection.description}
			</span>
		);
	}

	if (showGraphCount) {
		metaItems.push(
			<span key="graphs" className="settings-item-meta-item">
				{graphStatus!.count} {graphStatus!.count === 1 ? 'graph' : 'graphs'}
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

	if (graphStatus?.error) {
		metaItems.push(
			<span key="graphs" className="settings-item-meta-item graph-status-error" title={graphStatus.error}>
				Error loading graphs
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

	const subline = (metaItems.length > 0 || !isProtected)
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
			badge={!isProtected ? <ScopeBadge scope={connection.configScope} /> : null}
			locked={isProtected}
			lockTitle="Built-in connection"
			className={statusClass || undefined}
			keyboardNavProps={navProps}
			onClick={() => onEditConnection(connection)}
		/>
	);
}
