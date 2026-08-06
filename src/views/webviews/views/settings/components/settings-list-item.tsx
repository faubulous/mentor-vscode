import * as React from 'react';
import { ListItemNavProps } from '../hooks/use-list-keyboard-navigation';

export interface SettingsListItemProps {
	/**
	 * The item's leading icon. Supply a complete element carrying the
	 * `settings-item-icon` class (plus any status modifiers, e.g. `icon-success`)
	 * so the compound CSS selectors keep matching.
	 */
	icon: React.ReactNode;

	/**
	 * The primary label shown in the title row.
	 */
	name: React.ReactNode;

	/**
	 * Tooltip for the row (the `title` attribute).
	 */
	tooltip?: string;

	/**
	 * Trailing action buttons, wrapped in a stop-propagation container.
	 */
	actions?: React.ReactNode;

	/**
	 * Subline content (description / meta). Rendered only when present or a badge is set.
	 */
	subline?: React.ReactNode;

	/**
	 * Trailing badge (e.g. a scope badge) shown at the end of the subline.
	 */
	badge?: React.ReactNode;

	/**
	 * Visual status of the row. Tints the row background and the leading icon in
	 * the corresponding status color (the shared `--mentor-status-*` tokens, in
	 * sync with the stats dashboards); also colors {@link statusMessage}.
	 */
	status?: 'success' | 'warning' | 'error';

	/**
	 * Short status text rendered right-aligned at the end of the subline,
	 * prefixed with "• " and colored per {@link status}.
	 */
	statusMessage?: string;

	/**
	 * Tooltip for the status message.
	 */
	statusTooltip?: string;

	/**
	 * Renders a lock icon in the title row for protected/built-in items.
	 */
	locked?: boolean;

	/**
	 * Tooltip for the lock icon.
	 */
	lockTitle?: string;

	/**
	 * Extra CSS classes for the row root (e.g. connection test status).
	 */
	className?: string;

	/**
	 * Keyboard navigation props. The `onClick` handler is wired to the row's click event, so the caller can handle selection/navigation.
	 */
	keyboardNavProps?: ListItemNavProps;

	/**
	 * Invoked when the row is clicked. The caller is expected to handle selection/navigation. The `navProps` handler is wired to the row's click event, so this is only needed when the caller wants to handle clicks in addition to keyboard navigation.
	 */
	onClick: () => void;
}

/**
 * A single row in a {@link SettingsList}. Renders the shared `settings-item`
 * skeleton — a nav-wired clickable body with a leading icon, a title row holding
 * the name, trailing action buttons and an optional lock, and a subline holding
 * caller-supplied description/meta plus an optional badge. Every field is a slot
 * so stores, connections and validation profiles can supply their own content.
 */
export function SettingsListItem({
	icon,
	name,
	tooltip,
	actions,
	subline,
	badge,
	status,
	statusMessage,
	statusTooltip,
	locked,
	lockTitle,
	className,
	keyboardNavProps: navProps,
	onClick,
}: SettingsListItemProps) {
	const rootClass = ['settings-item', navProps?.selected ? 'selected' : '', status ? `status-${status}` : '', className ?? '']
		.filter(Boolean)
		.join(' ');

	const hasSubline = subline != null || badge != null || statusMessage != null;

	return (
		<div
			className={rootClass}
			role="button"
			tabIndex={navProps?.tabIndex ?? 0}
			ref={navProps?.ref}
			onKeyDown={navProps?.onKeyDown}
			onFocus={navProps?.onFocus}
			onClick={onClick}
			title={tooltip}
		>
			{icon}
			<div className="settings-item-body">
				<div className="settings-item-titlerow">
					<span className="settings-item-name">{name}</span>
					{actions && (
						<div className="settings-item-actions" onClick={e => e.stopPropagation()}>
							{actions}
						</div>
					)}
					{locked && (
						<vscode-icon name="lock" className="settings-item-lock" title={lockTitle} />
					)}
				</div>
				{hasSubline && (
					<div className="settings-item-subline">
						{subline}
						{badge}
						{statusMessage && (
							<span className="settings-item-status" title={statusTooltip}>{statusMessage}</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
