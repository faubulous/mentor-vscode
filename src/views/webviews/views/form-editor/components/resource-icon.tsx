/**
 * Properties of the {@link ResourceIcon} component.
 */
export interface ResourceIconProps {
	/**
	 * The name of the icon the definition tree shows for the resource.
	 */
	iconName: string;

	/**
	 * The size of the icon in pixels; 16 as in the definition tree when left out.
	 */
	size?: number;
}

/**
 * The icon the definition tree shows for a resource, in the colour the tree gives its kind.
 * @param props The icon name and size.
 * @returns The icon.
 */
export function ResourceIcon({ iconName, size = 16 }: ResourceIconProps): React.JSX.Element {
	// The name again as an attribute, which the colours of the kinds are selected by: React sets the
	// name of the custom element as a property, which a style rule cannot see.
	return <vscode-icon className="resource-icon" name={iconName} data-icon={iconName} size={size} aria-hidden="true"></vscode-icon>;
}
