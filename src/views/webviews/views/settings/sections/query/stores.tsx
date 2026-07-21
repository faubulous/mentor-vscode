import { useCallback, useContext, useState } from 'react';
import { ModalDialog } from '@src/views/webviews/components/modal-dialog';
import { useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TripleStoreConfig, generateStoreId } from '@src/languages/sparql/services/triple-store-config';
import { SettingsSectionProps } from '../../settings-section-props';
import { SettingsWorkspaceContext } from '../../components/setting-context';
import { useScopedSettingValue } from '../../hooks/use-scoped-setting-value';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { StoresList } from './components/stores-list';
import { StoresSectionMessages } from './stores-messages';
import { StoreEditor } from './components/store-editor';
import { PRESET_STORES } from '@src/languages/sparql/services/default-stores';
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
	// User/workspace entries that reuse a preset id are legacy duplicates from the former
	// first-run seeding. Hide them so each store appears once — the read-only preset is shown
	// instead, mirroring the preset-id filter in getStoreConfigs().
	const presetIds = new Set(PRESET_STORES.map(s => s.id));
	const isEditable = (store: TripleStoreConfig) => !store.isProtected && !presetIds.has(store.id) && store.id !== WORKSPACE_STORE.id;

	const sortByLabel = (stores: TripleStoreConfig[]) => [...stores].sort((a, b) => a.label.localeCompare(b.label));

	// Presets follow their canonical definition order (workspace, sparql, jena, qlever, rdf4j)
	// rather than being sorted alphabetically.
	const presetStores = [WORKSPACE_STORE, ...PRESET_STORES];
	const editableUserStores = sortByLabel(userStores.filter(isEditable));
	const editableWorkspaceStores = sortByLabel(workspaceStores.filter(isEditable));

	const isReadOnly = !!editing && !!editing.isProtected;
	// A store is "new" until it has been saved into the settings array (protected stores are never new).
	const isNew = !!editing && !isReadOnly && !allConfigStores.some(p => p.id === editing.id);

	const closeEditor = () => {
		setEditorDirty(false);
		setEditing(undefined);
	};

	const handleSave = (store: TripleStoreConfig) => {
		const target = store.configScope === ConfigurationScope.Workspace ? 'workspace' : 'user';

		// The id is minted from the label at first save (empty-id draft) and never
		// changes on a rename, mirroring how validation-profile ids work. Preset
		// and reserved internal ids are excluded because settings entries colliding
		// with them are silently hidden at read time.
		const id = store.id || generateStoreId(store.label, [
			...PRESET_STORES.map(s => s.id),
			WORKSPACE_STORE.id,
			...userRef.current.map(s => s.id),
			...workspaceRef.current.map(s => s.id),
		]);

		const clean = stripStoreScope({ ...store, id });

		// A store that previously lived in the other scope is being moved: the host
		// warns about connections in the old scope that still reference it.
		const movedScope = (target === 'user' ? workspaceRef.current : userRef.current).some(s => s.id === id);

		// Recompute both scope arrays so a moved store ends up only in its target scope.
		const nextUser = userRef.current.filter(s => s.id !== id);
		const nextWorkspace = workspaceRef.current.filter(s => s.id !== id);

		(target === 'user' ? nextUser : nextWorkspace).push(clean);

		commit(nextUser, nextWorkspace);

		if (movedScope) {
			messaging?.postMessage({ id: 'StoreScopeChanged', storeId: id, label: clean.label, newScope: target });
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
				presetStores={presetStores}
				workspaceStores={editableWorkspaceStores}
				userStores={editableUserStores}
				hasWorkspace={hasWorkspace}
				onCreate={(scope) => setEditing({ id: '', label: '', configScope: scope })}
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
