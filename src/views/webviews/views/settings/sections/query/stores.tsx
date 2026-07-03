import { useCallback, useContext, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ModalDialog } from '@src/views/webviews/components/modal-dialog';
import { useScopedWebviewMessaging } from '@src/views/webviews/webview-hooks';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { SettingsSectionProps } from '../../settings-section-props';
import { SettingsWorkspaceContext } from '../../components/setting-context';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { StoresList } from './stores-list';
import { StoresSectionMessages } from './stores-messages';
import { StoreEditor } from './store-editor';
import { WORKSPACE_STORE } from '@src/languages/sparql/services/workspace-store';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';

const STORES_KEY = 'sparql.stores';

export const queryStoresSection = {
	id: 'query.stores',
	label: 'Stores',
	component: QueryStoresSection,
	keys: [
		STORES_KEY
	]
} as const satisfies SettingsSectionDescriptor;

export function QueryStoresSection({ settings, setScope }: SettingsSectionProps) {
	const hasWorkspace = useContext(SettingsWorkspaceContext);

	// Stores are split across the two configuration scopes. Tag each with its scope so the
	// editor and the persistence logic know where it lives; the list shows them merged.
	const userStores = ((settings[STORES_KEY]?.userValue ?? []) as TripleStoreConfig[])
		.map(s => ({ ...s, configScope: ConfigurationScope.User }));

	const workspaceStores = ((settings[STORES_KEY]?.workspaceValue ?? []) as TripleStoreConfig[])
		.map(s => ({ ...s, configScope: ConfigurationScope.Workspace }));

	// The generic `sparql` store ships as the package.json `default` of `mentor.sparql.stores`.
	// VS Code serves it from the installed manifest, so it is always present without being
	// persisted to settings. Shown read-only/protected, never removable. The other built-ins
	// (jena, rdf4j, ...) are seeded once into user settings and appear as editable user stores.
	const defaultStores = ((settings[STORES_KEY]?.defaultValue ?? []) as TripleStoreConfig[])
		.map(s => ({ ...s, isProtected: true }));

	const allConfigStores = [...userStores, ...workspaceStores];

	const [editing, setEditing] = useState<TripleStoreConfig | undefined>(undefined);
	const [editorDirty, setEditorDirty] = useState(false);

	// Persists a single scope's store array (transient scope markers stripped). Reuses the
	// generic scope-targeted write so all configuration writes go through one host path.
	const writeScopeStores = useCallback((scope: 'user' | 'workspace', stores: TripleStoreConfig[]) => {
		setScope(MENTOR_SETTINGS_SOURCE, STORES_KEY, scope, stores.map(stripStoreScope));
	}, [setScope]);

	// Refs keep the latest values available to message callbacks bound once.
	const userStoresRef = useRef(userStores);
	userStoresRef.current = userStores;

	const workspaceStoresRef = useRef(workspaceStores);
	workspaceStoresRef.current = workspaceStores;

	const writeRef = useRef(writeScopeStores);
	writeRef.current = writeScopeStores;

	const handleMessage = useCallback((message: StoresSectionMessages) => {
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

	const messaging = useScopedWebviewMessaging<StoresSectionMessages>('query.stores', handleMessage);

	// The built-in workspace store is synthetic and shown read-only; any stray persisted entry
	// (id 'workspace') is filtered out of the editable list. Inference is controlled per connection.
	// User/workspace entries that reuse a built-in id are legacy duplicates of a catalog store
	// (built-ins now ship from the manifest). Hide them so each store appears once — the protected
	// built-in is shown instead, mirroring the runtime union-by-id in getStoreConfigs().
	const defaultIds = new Set(defaultStores.map(s => s.id));
	const editableStores = allConfigStores.filter(p => !p.isProtected && !defaultIds.has(p.id));
	const allStores = [
		WORKSPACE_STORE,
		...[...defaultStores].sort((a, b) => a.label.localeCompare(b.label)),
		...[...editableStores].sort((a, b) => a.label.localeCompare(b.label)),
	];

	const isReadOnly = !!editing && !!editing.isProtected;
	// A store is "new" until it has been saved into the settings array (protected stores are never new).
	const isNew = !!editing && !isReadOnly && !allConfigStores.some(p => p.id === editing.id);

	const closeEditor = () => {
		setEditorDirty(false);
		setEditing(undefined);
	};

	const stripStoreScope = (store: TripleStoreConfig): TripleStoreConfig => {
		const copy = { ...store };
		delete copy.configScope; // Remove the UI-specific configScope field.
		return copy;
	}

	const handleSave = (store: TripleStoreConfig) => {
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

	const handleDelete = (store: TripleStoreConfig) => {
		if (!store.isProtected) {
			messaging?.postMessage({ id: 'DeleteStoreProfile', profileId: store.id, label: store.label });
		}
	};

	const modalTitle = isReadOnly ? (editing as TripleStoreConfig).label : isNew ? 'New Store' : 'Edit Store';

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
