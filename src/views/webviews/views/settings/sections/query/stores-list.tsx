import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { StoresListItem } from './stores-list-item';
import { useListKeyboardNavigation } from '../../components/use-list-keyboard-navigation';

export interface StoresListProps {
	stores: TripleStoreConfig[];
	onCreate: () => void;
	onEdit: (store: TripleStoreConfig) => void;
	onDelete: (store: TripleStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * Lists the defined SPARQL store types. Mirrors the SPARQL connections list:
 * a page-level header, a "Protected" subsection for built-in stores, and a
 * "User Defined" subsection with an Add action. All edits happen in the modal
 * opened from a row.
 */
export function StoresList({ stores, onCreate, onEdit, onDelete, onOpenInBrowser }: StoresListProps) {
	const protectedStores = stores.filter(s => s.isProtected);
	const userDefinedStores = stores.filter(s => !s.isProtected);

	// Navigation spans both subsections in visual (top-to-bottom) order.
	const orderedStores = [...protectedStores, ...userDefinedStores];
	const { getItemProps } = useListKeyboardNavigation(
		orderedStores.map(s => s.id),
		{ onActivate: id => { const found = stores.find(s => s.id === id); if (found) { onEdit(found); } } }
	);

	const renderItem = (store: TripleStoreConfig) => (
		<StoresListItem
			key={store.id}
			store={store}
			navProps={getItemProps(store.id)}
			onEdit={onEdit}
			onDelete={onDelete}
			onOpenInBrowser={onOpenInBrowser}
		/>
	);

	return (
		<div className="connections-list-container">
			<SectionHeader title="Stores" variant="title" />

			{protectedStores.length > 0 && (
				<section className="connections-subsection">
					<SectionHeader
						title="Protected"
						description="Mentor built-in stores that cannot be removed."
					/>
					<div className="connections-list">
						{protectedStores.map(renderItem)}
					</div>
				</section>
			)}

			<section className="connections-subsection">
				<SectionHeader
					title="User Defined"
					description="Store types you have configured."
					actions={
						<vscode-toolbar-button className="primary" title="Add a new store" onClick={onCreate}>
							<span className="codicon codicon-add" />
							<span className="label">Add Store</span>
						</vscode-toolbar-button>
					}
				/>
				{userDefinedStores.length === 0 ? (
					<p className="connections-empty-message">No user-defined stores yet.</p>
				) : (
					<div className="connections-list">
						{userDefinedStores.map(renderItem)}
					</div>
				)}
			</section>
		</div>
	);
}
