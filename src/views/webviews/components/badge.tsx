import * as React from 'react';
import { useStylesheet } from '@src/views/webviews/hooks';
import stylesheet from './badge.css';

export interface BadgeProps {
	/**
	 * Tooltip shown on hover.
	 */
	title?: string;

	/**
	 * Extra CSS classes, e.g. a status modifier like `badge-error`.
	 */
	className?: string;

	children: React.ReactNode;
}

/**
 * Read-only pill indicator used as a trailing accessory on settings list rows,
 * e.g. the graph count on connection rows.
 */
export function Badge({ title, className, children }: BadgeProps) {
	useStylesheet('badge-styles', stylesheet);

	return (
		<span className={['item-badge', className ?? ''].filter(Boolean).join(' ')} title={title}>
			{children}
		</span>
	);
}
