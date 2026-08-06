/**
 * Props for {@link SettingsItemDescription}.
 */
export interface SettingsItemDescriptionProps {
	/**
	 * The item's description. Blank or missing text renders the shared
	 * "No description" placeholder instead.
	 */
	text?: string;

	/**
	 * CSS class(es) for the description span; defaults to the shared
	 * `settings-item-description` look. Pass the context-specific class when
	 * the surrounding subline provides its own layout (e.g. the connections
	 * meta list or the validation profile row).
	 */
	className?: string;
}

/**
 * Description line for a settings list item (connection, store, validation
 * profile). Renders the muted italic "No description" placeholder when the
 * item has none, so every list communicates the absence consistently instead
 * of collapsing the subline.
 */
export function SettingsItemDescription({ text, className }: SettingsItemDescriptionProps) {
	const description = text?.trim();
	const classes = `${className ?? 'settings-item-description'}${description ? '' : ' settings-item-description-empty'}`;

	return <span className={classes}>{description || 'No description'}</span>;
}
