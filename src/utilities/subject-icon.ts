import { ResourceIconContext, getResourceIconName } from '@src/utilities/resource-icon';

/**
 * The glyph of a resource nothing identifies: an individual, the plainest kind of thing to be.
 */
export const DEFAULT_ICON = 'mentor-rdf-individual';

/**
 * Get the icon glyph of a resource, as the definition tree shows it. The custom glyphs are
 * addressed with the `mentor-` prefix in a webview, because the icon font is folded into the
 * codicon stylesheet under that namespace; the built-in codicons are used as they are.
 * @param typeIris The IRIs of the resource's types.
 * @param context What else is known about the resource.
 * @returns The name of the icon to show.
 */
export function getSubjectIconName(typeIris: readonly string[], context?: ResourceIconContext): string {
	const name = getResourceIconName(typeIris, context);

	if (!name) {
		return DEFAULT_ICON;
	}

	return name.startsWith('rdf-') ? `mentor-${name}` : name;
}
