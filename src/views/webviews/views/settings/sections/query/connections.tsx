import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ModalDialog } from '../../../../components/modal-dialog';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlConnectionEditor } from '../../../sparql-connection/sparql-connection-editor';
import { SparqlConnectionMessages } from '../../../sparql-connection/sparql-connection-messages';
import { SparqlConnectionsList } from '../../../sparql-connections-list/sparql-connections-list';
import { SparqlConnectionsListMessages } from '../../../sparql-connections-list/sparql-connections-list-messages';
import { MENTOR_SOURCE, TestResult } from '../../settings-types';
import { SettingsSectionProps } from '../../settings-section-props';
import { useScopedWebviewMessaging } from '../../../../webview-hooks';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const queryConnectionsSection = {
	id: 'connections',
	label: 'Connections',
	component: QueryConnectionsSection,
	keys: ['sparql.connections', 'sparql.queryTimeout'],
} as const satisfies SettingsSectionDescriptor;

type QueryConnectionsSectionMessage = SparqlConnectionsListMessages | SparqlConnectionMessages;

export function QueryConnectionsSection({ settings, onUpdate, setScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);

	const [connections, setConnections] = useState<SparqlConnection[]>([]);
	const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
	const [editingConnection, setEditingConnection] = useState<SparqlConnection | undefined>(undefined);
	const [editorDirty, setEditorDirty] = useState(false);
	const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());

	const handleMessage = useCallback((message: QueryConnectionsSectionMessage) => {
		switch (message.id) {
			case 'GetConnectionsResult':
			case 'ConnectionsChanged':
				setConnections(message.connections);
				return;
			case 'TestConnectionResult':
				setTestResults(prev => ({
					...prev,
					[message.connectionId]: message.success
						? { success: true }
						: { success: false, error: message.error },
				}));
				return;
			case 'EditSparqlConnection':
				setEditingConnection(message.connection);
				return;
		}
	}, []);

	const messaging = useScopedWebviewMessaging<QueryConnectionsSectionMessage>('connections', handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetConnections' });
	}, []);

	useEffect(() => {
		setTestingConnections(prev => {
			const updated = new Set(prev);

			for (const id of prev) {
				if (testResults[id] !== null && testResults[id] !== undefined) {
					updated.delete(id);
				}
			}

			return updated.size === prev.size ? prev : updated;
		});
	}, [testResults]);

	const handleTestConnection = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingConnections(prev => new Set(prev).add(connection.id));
		messaging?.postMessage({ id: 'TestConnection', connection });
	};

	const handleListGraphs = (connection: SparqlConnection, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingConnections(prev => new Set(prev).add(connection.id));
		messaging?.postMessage({ id: 'ListGraphs', connection });
	};

	const closeEditor = (wasSaved: boolean = false) => {
		if (!wasSaved && editingConnection?.isNew) {
			messaging?.postMessage({ id: 'DiscardSparqlConnection', connectionId: editingConnection.id });
		}
		setEditorDirty(false);
		setEditingConnection(undefined);
	};

	return (
		<>
			<SparqlConnectionsList
				connections={connections}
				testResults={testResults}
				testingConnections={testingConnections}
				onCreateConnection={() => messaging?.postMessage({ id: 'CreateConnection' })}
				onEditConnection={(connection) => setEditingConnection(connection)}
				onDeleteConnection={(connection) => messaging?.postMessage({ id: 'DeleteConnection', connection })}
				onTestConnection={handleTestConnection}
				onListGraphs={handleListGraphs}
				onOpenInBrowser={(url) => messaging?.postMessage({ id: 'OpenInBrowser', url })}
				onChangeSparqlConnectionScope={(connection, toScope) => messaging?.postMessage({ id: 'ChangeSparqlConnectionScope', connection, toScope })}
			/>
			<div className="settings-subsection">
				<SettingRow {...rowProps('sparql.queryTimeout')}>
					<vscode-textfield
						className="setting-input-md"
						value={String(settings['sparql.queryTimeout']?.value ?? 30000)}
						type="number"
						onInput={(e: any) => onUpdate(MENTOR_SOURCE, 'sparql.queryTimeout', Number((e.target as HTMLInputElement).value))}
					>
						<span slot="content-after" className="setting-input-suffix">ms</span>
					</vscode-textfield>
				</SettingRow>
			</div>
			<ModalDialog
				open={!!editingConnection}
				title="Edit Connection"
				onClose={() => closeEditor(false)}
				requireCloseConfirmation={editorDirty}
				closeConfirmationMessage="You have unsaved changes. Discard them?"
				closeConfirmLabel="Discard"
				hideCloseButton
			>
				{editingConnection && (
					<SparqlConnectionEditor
						connection={editingConnection}
						hideHeader
						showScopeSelector
						onDirtyChange={setEditorDirty}
						onBack={() => closeEditor(false)}
						onSaved={() => closeEditor(true)}
					/>
				)}
			</ModalDialog>
		</>
	);
}