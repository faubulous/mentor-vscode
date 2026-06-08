import * as React from 'react';
import { SparqlStoreConfig } from '@src/languages/sparql/services/sparql-store-config';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { StoresListItem } from './stores-list-item';

export interface StoresListProps {
	stores: SparqlStoreConfig[];
	onCreate: () => void;
	onEdit: (store: SparqlStoreConfig) => void;
	onDelete: (store: SparqlStoreConfig) => void;
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

	const renderItem = (store: SparqlStoreConfig) => (
		<StoresListItem
			key={store.id}
			store={store}
			onEdit={onEdit}
			onDelete={onDelete}
			onOpenInBrowser={onOpenInBrowser}
		/>
	);

	return (
		<div className="connections-list-container">
			<FormSectionHeader title="Stores" large />

			{protectedStores.length > 0 && (
				<section className="connections-subsection">
					<FormSectionHeader
						title="Protected"
						description="Mentor built-in stores that cannot be removed."
					/>
					<div className="connections-list">
						{protectedStores.map(renderItem)}
					</div>
				</section>
			)}

			<section className="connections-subsection">
				<FormSectionHeader
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
