import * as React from 'react';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ScopeBadge } from '@src/views/webviews/components/scope-badge';
import { TestResult } from '../../settings-types';
import { GraphStatus } from './connections-list-messages';
import { ListItemNavProps } from '../../components/use-list-keyboard-navigation';

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
		? <vscode-icon name="ellipsis" className="connection-item-icon icon-testing" />
		: testResult?.success === true
			? <vscode-icon name="pass" className="connection-item-icon icon-success" />
			: testResult?.success === false
				? <vscode-icon name="error" className="connection-item-icon icon-error" title={testResult.error} />
				: <vscode-icon name="arrow-swap" className="connection-item-icon" />;

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
	if (navProps?.selected) itemClass += ' selected';

	const showGraphCount = graphStatus?.count !== undefined && (connection.autoLoadGraphs || isWorkspaceStore);

	const metaItems: React.ReactNode[] = [];

	if (connection.description) {
		metaItems.push(
			<span key="description" className="connection-item-meta-item connection-item-meta-description">{connection.description}</span>
		);
	}
	if (connection.canToggleInference) {
		metaItems.push(
			<span key="inference" className="connection-item-meta-item">
				<span className="codicon codicon-lightbulb-sparkle" style={{ marginLeft: '-4px' }} />
				Inference
			</span>
		);
	}
	if (graphStatus?.error) {
		metaItems.push(
			<span key="graphs" className="connection-item-meta-item graph-status-error" title={graphStatus.error}>Error loading graphs</span>
		);
	} else if (showGraphCount) {
		metaItems.push(
			<span key="graphs" className="connection-item-meta-item">{graphStatus!.count} {graphStatus!.count === 1 ? 'graph' : 'graphs'}</span>
		);
	}

	return (
		<div
			className={itemClass}
			role="button"
			tabIndex={navProps?.tabIndex ?? 0}
			ref={navProps?.ref}
			onKeyDown={navProps?.onKeyDown}
			onFocus={navProps?.onFocus}
			onClick={() => onEditConnection(connection)}
			title={isWorkspaceStore ? 'Edit workspace store settings' : `Edit ${connection.endpointUrl}`}
		>
			{connectionIcon}
			<div className="connection-item-body">
				<div className="connection-item-titlerow">
					<span className="connection-item-name">{connection.endpointUrl}</span>
					<div className="connection-item-actions" onClick={e => e.stopPropagation()}>
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
					</div>
					{isProtected && (
						<vscode-icon name="lock" className="connection-item-lock" title="Built-in connection" />
					)}
				</div>
				{(metaItems.length > 0 || !isProtected) && (
					<div className="connection-item-subline">
						<div className="connection-item-meta">
							{metaItems.map((item, index) => (
								<React.Fragment key={index}>
									{item}
								</React.Fragment>
							))}
						</div>
						{!isProtected && <ScopeBadge scope={connection.configScope} />}
					</div>
				)}
			</div>
		</div>
	);
}
