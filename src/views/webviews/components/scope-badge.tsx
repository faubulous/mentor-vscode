import { ConfigurationScope, getConfigurationScopeDescription, getConfigurationScopeLabel } from '@src/utilities/config-scope';
import { useStylesheet } from '@src/views/webviews/webview-hooks';
import stylesheet from './scope-badge.css';

export interface ScopeBadgeProps {
	/** The scope the item is defined in. */
	scope: ConfigurationScope;
}

/**
 * Read-only indicator showing which configuration scope (User / Workspace) an item is defined in.
 * Used as a trailing accessory on connection and store list rows. Editing the scope happens in the
 * item's editor dialog via {@link ScopeSelect}.
 */
export function ScopeBadge({ scope }: ScopeBadgeProps) {
	useStylesheet('scope-badge-styles', stylesheet);

	return (
		<span className="scope-badge" title={getConfigurationScopeDescription(scope)}>
			{getConfigurationScopeLabel(scope)}
		</span>
	);
}
