import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { StoresListItem } from './stores-list-item';
import { SettingsList } from '../../../components/settings-list';

export interface StoresListProps {
	stores: TripleStoreConfig[];
	onCreate: () => void;
	onEdit: (store: TripleStoreConfig) => void;
	onDelete: (store: TripleStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * Lists the defined SPARQL store types via the shared {@link SettingsList}: a
 * page-level header, a "Protected" group for built-in stores (hidden when empty),
 * and a "User Defined" group with an Add action. All edits happen in the modal
 * opened from a row.
 */
export function StoresList({ stores, onCreate, onEdit, onDelete, onOpenInBrowser }: StoresListProps) {
	const protectedStores = stores.filter(s => s.isProtected);
	const userDefinedStores = stores.filter(s => !s.isProtected);

	return (
		<SettingsList<TripleStoreConfig>
			header={<SectionHeader title="Stores" variant="title" />}
			sections={[
				{
					title: 'Protected',
					description: 'Mentor built-in stores that cannot be removed.',
					items: protectedStores,
					emptyMessage: '',
					hideWhenEmpty: true,
				},
				{
					title: 'User Defined',
					description: 'Store types you have configured.',
					action: (
						<vscode-toolbar-button className="primary" title="Add a new store" onClick={onCreate}>
							<span className="codicon codicon-add" />
							<span className="label">Add Store</span>
						</vscode-toolbar-button>
					),
					items: userDefinedStores,
					emptyMessage: 'No user-defined stores yet.',
				},
			]}
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
