import { ConfigurationScope } from '@src/utilities/config-scope';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { StoresListItem } from './stores-list-item';
import { SettingsList, SettingsListSection } from '../../../components/settings-list';

export interface StoresListProps {
	presetStores: TripleStoreConfig[];
	workspaceStores: TripleStoreConfig[];
	userStores: TripleStoreConfig[];
	hasWorkspace: boolean;
	onCreate: (scope: ConfigurationScope) => void;
	onEdit: (store: TripleStoreConfig) => void;
	onDelete: (store: TripleStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * Lists the defined SPARQL store types via the shared {@link SettingsList},
 * grouped by where they are stored: built-in presets, workspace settings and
 * user settings. The workspace group is omitted when no workspace folder is
 * open. All edits happen in the modal opened from a row.
 */
export function StoresList({ presetStores, workspaceStores, userStores, hasWorkspace, onCreate, onEdit, onDelete, onOpenInBrowser }: StoresListProps) {
	const addAction = (scope: ConfigurationScope) => (
		<vscode-toolbar-button className="primary" title="Add a new store" onClick={() => onCreate(scope)}>
			<span className="codicon codicon-add" />
			<span className="label">Add Store</span>
		</vscode-toolbar-button>
	);

	const sections: SettingsListSection<TripleStoreConfig>[] = [
		{
			title: 'Presets',
			description: 'Built-in triple store configurations that ship with Mentor. They cannot be edited or removed.',
			items: presetStores,
			emptyMessage: '',
			hideWhenEmpty: true,
		},
		...(hasWorkspace ? [{
			title: 'Workspace',
			description: 'Stores kept in the workspace settings (.vscode/settings.json), which can be shared via version control.',
			action: addAction(ConfigurationScope.Workspace),
			items: workspaceStores,
			emptyMessage: 'No workspace stores yet.',
		}] : []),
		{
			title: 'User',
			description: 'Stores kept in your user settings, available in all your workspaces on this machine.',
			action: addAction(ConfigurationScope.User),
			items: userStores,
			emptyMessage: 'No user stores yet.',
		},
	];

	return (
		<SettingsList<TripleStoreConfig>
			header={<SectionHeader title="Stores" variant="title" />}
			sections={sections}
			getItemId={store => store.id}
			renderItem={(store, navProps) => (
				<StoresListItem
					store={store}
					navProps={navProps}
					onEdit={onEdit}
					onDelete={onDelete}
					onOpenInBrowser={onOpenInBrowser}
				/>
			)}
			onActivate={onEdit}
		/>
	);
}
