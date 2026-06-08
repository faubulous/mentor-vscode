import { useCallback, useContext, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ModalDialog } from '@src/views/webviews/components/modal-dialog';
import { useScopedWebviewMessaging } from '@src/views/webviews/webview-hooks';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { SparqlStoreConfig, SPARQL_QUERY_KINDS } from '@src/languages/sparql/services/sparql-store-config';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import { SettingsWorkspaceContext } from '../../components/setting-context';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { StoresList } from './stores-list';
import { StoreEditor } from './store-editor';
import { WORKSPACE_STORE } from '@src/languages/sparql/services/workspace-store';

const STORES_KEY = 'sparql.stores';

export const queryStoresSection = {
	id: 'query.stores',
	label: 'Stores',
	component: QueryStoresSection,
	keys: [
		STORES_KEY
	],
	// The global query templates are the fallback default for each store's query fields; they
	// remain settings but are edited through those fields (claimed here so dev-validation passes).
	hiddenKeys: Object.values(SPARQL_QUERY_KINDS).map(q => q.globalSettingKey),
} as const satisfies SettingsSectionDescriptor;

type StoresSectionMessage =
	| { id: 'DeleteStoreProfile'; profileId: string; label: string }
	| { id: 'StoreProfileDeleted'; profileId: string }
	| { id: 'OpenInBrowser'; url: string };

export function QueryStoresSection({ settings, setScope }: SettingsSectionProps) {
	const hasWorkspace = useContext(SettingsWorkspaceContext);

	// Stores are split across the two configuration scopes. Tag each with its scope so the
	// editor and the persistence logic know where it lives; the list shows them merged.
	const userStores = ((settings[STORES_KEY]?.userValue ?? []) as SparqlStoreConfig[])
		.map(s => ({ ...s, configScope: ConfigurationScope.User }));

	const workspaceStores = ((settings[STORES_KEY]?.workspaceValue ?? []) as SparqlStoreConfig[])
		.map(s => ({ ...s, configScope: ConfigurationScope.Workspace }));

	const allConfigStores = [...userStores, ...workspaceStores];

	const [editing, setEditing] = useState<SparqlStoreConfig | undefined>(undefined);
	const [editorDirty, setEditorDirty] = useState(false);

	// Persists a single scope's store array (transient scope markers stripped). Reuses the
	// generic scope-targeted write so all configuration writes go through one host path.
	const writeScopeStores = useCallback((scope: 'user' | 'workspace', stores: SparqlStoreConfig[]) => {
		setScope(MENTOR_SOURCE, STORES_KEY, scope, stores.map(stripStoreScope));
	}, [setScope]);

	// Refs keep the latest values available to message callbacks bound once.
	const userStoresRef = useRef(userStores);
	userStoresRef.current = userStores;

	const workspaceStoresRef = useRef(workspaceStores);
	workspaceStoresRef.current = workspaceStores;

	const writeRef = useRef(writeScopeStores);
	writeRef.current = writeScopeStores;

	const handleMessage = useCallback((message: StoresSectionMessage) => {
		if (message.id === 'StoreProfileDeleted') {
			const inUser = userStoresRef.current.some(s => s.id === message.profileId);
			const scope = inUser ? 'user' : 'workspace';
			const remaining = (inUser ? userStoresRef.current : workspaceStoresRef.current)
				.filter(s => s.id !== message.profileId);

			writeRef.current(scope, remaining);

			setEditing(prev => prev?.id === message.profileId ? undefined : prev);
			setEditorDirty(false);
		}
	}, []);

	const messaging = useScopedWebviewMessaging<StoresSectionMessage>('query.stores', handleMessage);

	// The built-in workspace store is synthetic and shown read-only; any stray persisted entry
	// (id 'workspace') is filtered out of the editable list. Inference is controlled per connection.
	const editableStores = allConfigStores.filter(p => !p.isProtected);
	const allStores = [WORKSPACE_STORE, ...[...editableStores].sort((a, b) => a.label.localeCompare(b.label))];

	const isReadOnly = !!editing && !!editing.isProtected;
	// A store is "new" until it has been saved into the settings array (protected stores are never new).
	const isNew = !!editing && !isReadOnly && !allConfigStores.some(p => p.id === editing.id);

	const closeEditor = () => {
		setEditorDirty(false);
		setEditing(undefined);
	};

	const stripStoreScope = (store: SparqlStoreConfig): SparqlStoreConfig => {
		const copy = { ...store };
		delete copy.configScope; // Remove the UI-specific configScope field.
		return copy;
	}

	const handleSave = (store: SparqlStoreConfig) => {
		const target = store.configScope === ConfigurationScope.Workspace ? 'workspace' : 'user';
		const clean = stripStoreScope(store);

		// Recompute both scope arrays so a moved store ends up only in its target scope.
		const nextUser = userStores.filter(s => s.id !== store.id).map(stripStoreScope);
		const nextWorkspace = workspaceStores.filter(s => s.id !== store.id).map(stripStoreScope);

		(target === 'user' ? nextUser : nextWorkspace).push(clean);

		// Only write a scope whose array actually changed — this avoids writing the (empty)
		// workspace array when no workspace is open.
		if (JSON.stringify(nextUser) !== JSON.stringify(userStores.map(stripStoreScope))) {
			writeScopeStores('user', nextUser);
		}
		if (JSON.stringify(nextWorkspace) !== JSON.stringify(workspaceStores.map(stripStoreScope))) {
			writeScopeStores('workspace', nextWorkspace);
		}

		closeEditor();
	};

	const handleDelete = (store: SparqlStoreConfig) => {
		if (!store.isProtected) {
			messaging?.postMessage({ id: 'DeleteStoreProfile', profileId: store.id, label: store.label });
		}
	};

	const modalTitle = isReadOnly ? (editing as SparqlStoreConfig).label : isNew ? 'New Store' : 'Edit Store';

	return (
		<>
			<StoresList
				stores={allStores}
				onCreate={() => setEditing({ id: uuidv4(), label: '', configScope: ConfigurationScope.User })}
				onEdit={(store) => setEditing(store)}
				onDelete={handleDelete}
				onOpenInBrowser={(url) => messaging?.postMessage({ id: 'OpenInBrowser', url })}
			/>
			<ModalDialog
				open={!!editing}
				title={modalTitle}
				onClose={closeEditor}
				requireCloseConfirmation={editorDirty}
				closeConfirmationMessage="You have unsaved changes. Discard them?"
				closeConfirmLabel="Discard"
				hideCloseButton
			>
				{editing && (
					<StoreEditor
						store={editing}
						isNew={isNew}
						readOnly={isReadOnly}
						hasWorkspace={hasWorkspace}
						settings={settings}
						onSave={handleSave}
						onDelete={handleDelete}
						onDirtyChange={setEditorDirty}
					/>
				)}
			</ModalDialog>
		</>
	);
}
