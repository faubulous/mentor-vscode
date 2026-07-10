import * as React from 'react';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { ScopeBadge } from '@src/views/webviews/components/scope-badge';
import { ListItemNavProps } from '../../../hooks/use-list-keyboard-navigation';
import { SettingsListItem } from '../../../components/settings-list-item';

export interface StoresListItemProps {
	store: TripleStoreConfig;
	navProps?: ListItemNavProps;
	onEdit: (store: TripleStoreConfig) => void;
	onDelete: (store: TripleStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * A single row in the stores list. A thin field-mapper over {@link SettingsListItem}:
 * protected (built-in) stores show a lock and cannot be deleted; others show a scope
 * badge and a delete button.
 */
export function StoresListItem({ store, navProps, onEdit, onDelete, onOpenInBrowser }: StoresListItemProps) {
	const isProtected = !!store.isProtected;
	const subtitle = store.website ?? store.description;
	const showBadge = !isProtected && store.configScope !== undefined;

	// The description span (flex:1) is rendered whenever the subline shows — even with no
	// subtitle — so it spaces the scope badge to the right, matching the original layout.
	const showSubline = !!subtitle || showBadge;

	const actions = (
		<>
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
				<vscode-toolbar-button className="settings-item-action-placeholder" aria-hidden="true" tabIndex={-1}>
					<vscode-icon name="blank" />
				</vscode-toolbar-button>
			)}
		</>
	);

	return (
		<SettingsListItem
			icon={<vscode-icon name="database" className="settings-item-icon" />}
			name={store.label}
			tooltip={isProtected ? `View ${store.label} settings` : `Edit ${store.label}`}
			actions={actions}
			subline={showSubline ? <span className="settings-item-description">{subtitle}</span> : null}
			badge={showBadge ? <ScopeBadge scope={store.configScope!} /> : null}
			locked={isProtected}
			lockTitle="Built-in store"
			keyboardNavProps={navProps}
			onClick={() => onEdit(store)}
		/>
	);
}
