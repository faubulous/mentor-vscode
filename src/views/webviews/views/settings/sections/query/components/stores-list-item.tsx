import * as React from 'react';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { ListItemNavProps } from '../../../hooks/use-list-keyboard-navigation';
import { SettingsListItem } from '../../../components/settings-list-item';
import { SettingsItemDescription } from '../../../components/settings-item-description';

export interface StoresListItemProps {
	store: TripleStoreConfig;
	navProps?: ListItemNavProps;
	onEdit: (store: TripleStoreConfig) => void;
	onDelete: (store: TripleStoreConfig) => void;
	onOpenInBrowser: (url: string) => void;
}

/**
 * A single row in the stores list. A thin field-mapper over {@link SettingsListItem}:
 * protected (built-in) stores show a lock and cannot be deleted. Stores with a
 * documentation URL offer an "open documentation" action.
 */
export function StoresListItem({ store, navProps, onEdit, onDelete, onOpenInBrowser }: StoresListItemProps) {
	const isProtected = !!store.isProtected;

	const actions = (
		<>
			{store.documentationUrl && (
				<vscode-toolbar-button
					title="Open documentation"
					onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenInBrowser(store.documentationUrl!); }}
				>
					<vscode-icon name="book" />
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
			{!store.documentationUrl && isProtected && (
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
			subline={<SettingsItemDescription text={store.description} />}
			locked={isProtected}
			lockTitle="Built-in store"
			keyboardNavProps={navProps}
			onClick={() => onEdit(store)}
		/>
	);
}
