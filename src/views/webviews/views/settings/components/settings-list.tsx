import * as React from 'react';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { ListItemNavProps, useListKeyboardNavigation } from '../hooks/use-list-keyboard-navigation';

/**
 * One grouped section of a {@link SettingsList} (e.g. "Protected" / "User Defined",
 * or "Default" / "User Selectable").
 */
export interface SettingsListSection<T> {
	/**
	 * Section heading.
	 */
	title: string;

	/**
	 * Optional description rendered under the heading.
	 */
	description?: string;

	/**
	 * Optional action element (e.g. an Add button) shown on the right of the heading.
	 */
	action?: React.ReactNode;

	/**
	 * The items belonging to this section.
	 */
	items: T[];

	/**
	 * Message shown when the section has no items.
	 */
	emptyMessage: string;

	/**
	 * When true, the whole section is hidden while it has no items (e.g. a "Protected" group).
	 */
	hideWhenEmpty?: boolean;
}

export interface SettingsListProps<T> {
	/**
	 * The grouped sections, rendered top-to-bottom.
	 */
	sections: SettingsListSection<T>[];

	/**
	 * Stable id for an item — used as the React key and for keyboard navigation.
	 */
	getItemId: (item: T) => string;

	/**
	 * Renders one row; receives the keyboard-navigation props to spread onto it.
	 */
	renderItem: (item: T, navProps: ListItemNavProps) => React.ReactNode;

	/**
	 * Invoked when a row is activated via keyboard (Enter/Space).
	 */
	onActivate: (item: T) => void;

	/**
	 * Optional content rendered above the sections (e.g. a page-level header).
	 */
	header?: React.ReactNode;
}

/**
 * The shared "manage a list of named items" container used by the stores,
 * connections and validation settings sections. Renders one or more grouped
 * sections — each with a {@link SectionHeader}, an add action and an empty
 * state — and wires a single keyboard-navigation model spanning all visible
 * rows so Arrow/Home/End/Enter move through the whole list. Rows are rendered
 * by the caller via {@link SettingsListProps.renderItem}, typically as
 * {@link SettingsListItem}.
 */
export function SettingsList<T>({ sections, getItemId, renderItem, onActivate, header }: SettingsListProps<T>) {
	// Navigation spans every visible item in visual (top-to-bottom) order.
	const orderedItems = sections.flatMap(section => section.items);
	const idToItem = new Map(orderedItems.map(item => [getItemId(item), item] as const));

	const { getItemProps } = useListKeyboardNavigation(
		orderedItems.map(getItemId),
		{ onActivate: id => { const item = idToItem.get(id); if (item) { onActivate(item); } } }
	);

	return (
		<div className="settings-list-container">
			{header}
			{sections.map((section, index) => {
				if (section.hideWhenEmpty && section.items.length === 0) {
					return null;
				}

				return (
					<section className="settings-list-section" key={index}>
						<SectionHeader
							title={section.title}
							description={section.description}
							actions={section.action}
						/>
						{section.items.length === 0 ? (
							<p className="settings-list-empty">{section.emptyMessage}</p>
						) : (
							<div className="settings-list">
								{section.items.map(item => (
									<React.Fragment key={getItemId(item)}>
										{renderItem(item, getItemProps(getItemId(item)))}
									</React.Fragment>
								))}
							</div>
						)}
					</section>
				);
			})}
		</div>
	);
}
