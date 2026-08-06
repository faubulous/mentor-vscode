import * as React from 'react';
import { useStylesheet } from '../hooks';
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from './section-header-context-menu';
import stylesheet from './section-header.css';

/**
 * Visual level of a {@link SectionHeader}:
 * - `'title'`: large page-level heading.
 * - `'subsection'`: medium heading for a group of settings within a page.
 * - `'setting'`: small heading for an individual setting (default).
 */
type SectionHeaderVariant = 'title' | 'subsection' | 'setting';

export interface SectionHeaderProps {
	/**
	 * Title to render. Accepts ReactNode to allow inline badges (e.g. "Experimental").
	 */
	title: React.ReactNode;

	/**
	 * Optional short description rendered below the title.
	 */
	description?: React.ReactNode;

	/**
	 * Optional inline action elements (buttons, links) rendered on the right side.
	 */
	actions?: React.ReactNode;

	/**
	 * Optional kebab-menu items rendered on the right side of the header.
	 */
	menuItems?: SectionHeaderContextMenuItem[];

	/**
	 * Visual level of the header. Defaults to `'setting'`.
	 */
	variant?: SectionHeaderVariant;
}

/**
 * Generic section header used across mentor webviews. Renders a title plus an
 * optional kebab context menu, separated from the section body by a thin border.
 */
export function SectionHeader({ title, description, actions, menuItems, variant = 'setting' }: SectionHeaderProps) {
	useStylesheet('mentor-section-header-styles', stylesheet);

	const className = `form-section-header variant-${variant}`;

	return (
		<div className={className}>
			<div className="form-section-header-title-wrapper">
				<h2 className="form-section-header-title">{title}</h2>
				<div className="form-section-leader" aria-hidden="true"></div>
				{actions && <div className="form-section-header-actions">{actions}</div>}
				<SectionHeaderContextMenu items={menuItems ?? []} />
			</div>
			{description && <p className="form-section-header-description">{description}</p>}
		</div>
	);
}
