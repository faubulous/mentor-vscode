import { useCallback, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ModalDialog } from '@src/views/webviews/components/modal-dialog';
import { useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { SettingsSectionProps } from '../../settings-section-props';
import { SettingsWorkspaceContext } from '../../components/setting-context';
import { useScopedSettingValue } from '../../hooks/use-scoped-setting-value';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { StoresList } from './components/stores-list';
import { StoresSectionMessages } from './stores-messages';
import { StoreEditor } from './components/store-editor';
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

/**
 * Removes the UI-specific `configScope` marker before an item is persisted.
 */
function stripStoreScope(store: TripleStoreConfig): TripleStoreConfig {
	const copy = { ...store };
	delete copy.configScope;
	return copy;
}

export function QueryStoresSection({ settings, setScope }: SettingsSectionProps) {
	const hasWorkspace = useContext(SettingsWorkspaceContext);

	// Stores are split across the user and workspace scopes; the shared hook owns the
	// read/diff/write mechanics. The persisted arrays carry no `configScope`; we tag each
	// entry with its scope here for display.
	const { userValue, workspaceValue, userRef, workspaceRef, commit } = useScopedSettingValue<TripleStoreConfig[]>({
		source: MENTOR_SETTINGS_SOURCE,
		key: STORES_KEY,
		settings,
		setScope,
		read: raw => (Array.isArray(raw) ? raw : []) as TripleStoreConfig[],
	});

	const userStores = userValue.map(s => ({ ...s, configScope: ConfigurationScope.User }));
	const workspaceStores = workspaceValue.map(s => ({ ...s, configScope: ConfigurationScope.Workspace }));

	// The generic `sparql` store ships as the package.json `default` of `mentor.sparql.stores`.
	// VS Code serves it from the installed manifest, so it is always present without being
	// persisted to settings. Shown read-only/protected, never removable. The other built-ins
	// (jena, rdf4j, ...) are seeded once into user settings and appear as editable user stores.
	const defaultStores = ((settings[STORES_KEY]?.defaultValue ?? []) as TripleStoreConfig[])
		.map(s => ({ ...s, isProtected: true }));

	const allConfigStores = [...userStores, ...workspaceStores];

	const [editing, setEditing] = useState<TripleStoreConfig | undefined>(undefined);
	const [editorDirty, setEditorDirty] = useState(false);

	const handleMessage = useCallback((message: StoresSectionMessages) => {
		if (message.id === 'StoreProfileDeleted') {
			// The host confirmed the deletion — drop the store from whichever scope holds it.
			const nextUser = userRef.current.filter(s => s.id !== message.profileId);
			const nextWorkspace = workspaceRef.current.filter(s => s.id !== message.profileId);

			commit(nextUser, nextWorkspace);

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

	const handleSave = (store: TripleStoreConfig) => {
		const target = store.configScope === ConfigurationScope.Workspace ? 'workspace' : 'user';
		const clean = stripStoreScope(store);

		// Recompute both scope arrays so a moved store ends up only in its target scope.
		const nextUser = userRef.current.filter(s => s.id !== store.id);
		const nextWorkspace = workspaceRef.current.filter(s => s.id !== store.id);

		(target === 'user' ? nextUser : nextWorkspace).push(clean);

		commit(nextUser, nextWorkspace);
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
