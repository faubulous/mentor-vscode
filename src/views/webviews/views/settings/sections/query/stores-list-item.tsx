import * as React from 'react';
import { SparqlStoreConfig } from '@src/languages/sparql/services/sparql-store-config';
import { ScopeBadge } from '@src/views/webviews/components/scope-badge';
import { isProtectedStore } from './workspace-store';

export interface StoresListItemProps {
	store: SparqlStoreConfig;
	onEdit: (store: SparqlStoreConfig) => void;
	onDelete: (store: SparqlStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * A single row in the stores list. Mirrors the SPARQL connection list item: a
 * clickable body that opens the edit modal, plus a trailing delete button.
 * Protected (built-in) stores show a lock badge and cannot be deleted.
 */
export function StoresListItem({ store, onEdit, onDelete, onOpenInBrowser }: StoresListItemProps) {
	const isProtected = isProtectedStore(store);
	const subtitle = store.website
		?? store.description
		?? (store.inference?.supported === true ? 'Reasoning supported' : undefined);

	return (
		<div
			className="connection-item"
			onClick={() => onEdit(store)}
			title={isProtected ? 'View workspace store settings' : `Edit ${store.label}`}
		>
			<vscode-icon name="database" className="connection-item-icon" />
			<div className="connection-item-body">
				<div className="connection-item-titlerow">
					<span className="connection-item-name">{store.label}</span>
					<div className="connection-item-actions" onClick={e => e.stopPropagation()}>
						{store.website && (
							<vscode-toolbar-button
								title="Open in browser"
								onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenInBrowser(store.website!); }}
							>
								<vscode-icon name="link-external" />
							</vscode-toolbar-button>
						)}
						{!isProtected && (
							<vscode-toolbar-button
								title="Delete store"
								onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(store); }}
							>
								<vscode-icon name="trash" />
							</vscode-toolbar-button>
						)}
					</div>
					{isProtected && (
						<vscode-icon name="lock" className="connection-item-lock" title="Built-in store" />
					)}
				</div>
				{(subtitle || (!isProtected && store.configScope !== undefined)) && (
					<div className="connection-item-subline">
						<span className="connection-item-description">{subtitle}</span>
						{!isProtected && store.configScope !== undefined && <ScopeBadge scope={store.configScope} />}
					</div>
				)}
			</div>
		</div>
	);
}
