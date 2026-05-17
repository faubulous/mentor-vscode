import * as React from 'react';
import { useStylesheet } from '../webview-hooks';
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from './section-header-context-menu';
import stylesheet from './form-section-header.css';

export interface FormSectionHeaderProps {
	/** Title to render. Accepts ReactNode to allow inline badges (e.g. "Experimental"). */
	title: React.ReactNode;
	/** Optional kebab-menu items rendered on the right side of the header. */
	menuItems?: SectionHeaderContextMenuItem[];
	/** Renders the larger page-level variant. Defaults to a smaller sub-section title. */
	large?: boolean;
}

/**
 * Generic section header used across mentor webviews. Renders a title plus an
 * optional kebab context menu, separated from the section body by a thin border.
 */
export function FormSectionHeader({ title, menuItems, large }: FormSectionHeaderProps) {
	useStylesheet('mentor-form-section-header-styles', stylesheet);

	const className = ['form-section-header', large ? 'size-large' : ''].filter(Boolean).join(' ');

	return (
		<div className={className}>
			<h2 className="form-section-header-title">{title}</h2>
			<SectionHeaderContextMenu items={menuItems ?? []} />
		</div>
	);
}
