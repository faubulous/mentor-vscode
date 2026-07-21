import * as React from 'react';
import { useStylesheet } from '../webview-hooks';
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from './section-header-context-menu';
import stylesheet from './form-section-header.css';

export interface FormSectionHeaderProps {
	/** Title to render. Accepts ReactNode to allow inline badges (e.g. "Experimental"). */
	title: React.ReactNode;
	/** Optional short description rendered below the title. */
	description?: React.ReactNode;
	/** Optional inline action elements (buttons, links) rendered on the right side. */
	actions?: React.ReactNode;
	/** Optional kebab-menu items rendered on the right side of the header. */
	menuItems?: SectionHeaderContextMenuItem[];
	/** Renders the larger page-level variant. Defaults to a smaller sub-section title. */
	large?: boolean;
}

/**
 * Generic section header used across mentor webviews. Renders a title plus an
 * optional kebab context menu, separated from the section body by a thin border.
 */
export function FormSectionHeader({ title, description, actions, menuItems, large }: FormSectionHeaderProps) {
	useStylesheet('mentor-form-section-header-styles', stylesheet);

	const className = ['form-section-header', large ? 'size-large' : ''].filter(Boolean).join(' ');

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
