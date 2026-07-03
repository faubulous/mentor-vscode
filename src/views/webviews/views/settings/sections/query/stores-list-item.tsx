import * as React from 'react';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { ScopeBadge } from '@src/views/webviews/components/scope-badge';
import { ListItemNavProps } from '../../components/use-list-keyboard-navigation';

export interface StoresListItemProps {
	store: TripleStoreConfig;
	navProps?: ListItemNavProps;
	onEdit: (store: TripleStoreConfig) => void;
	onDelete: (store: TripleStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * A single row in the stores list. Mirrors the SPARQL connection list item: a
 * clickable body that opens the edit modal, plus a trailing delete button.
 * Protected (built-in) stores show a lock badge and cannot be deleted.
 */
export function StoresListItem({ store, navProps, onEdit, onDelete, onOpenInBrowser }: StoresListItemProps) {
	const isProtected = !!store.isProtected;
	const subtitle = store.website ?? store.description;

	return (
		<div
			className={`connection-item${navProps?.selected ? ' selected' : ''}`}
			role="button"
			tabIndex={navProps?.tabIndex ?? 0}
			ref={navProps?.ref}
			onKeyDown={navProps?.onKeyDown}
			onFocus={navProps?.onFocus}
			onClick={() => onEdit(store)}
			title={isProtected ? `View ${store.label} settings` : `Edit ${store.label}`}
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
						{!store.website && isProtected && (
							// Placeholder reserving the same row height as rows that have action buttons.
							<vscode-toolbar-button className="connection-item-action-placeholder" aria-hidden="true" tabIndex={-1}>
								<vscode-icon name="blank" />
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
