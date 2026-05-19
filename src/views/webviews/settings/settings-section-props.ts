import { SettingScope, SettingState } from "./settings-types";

/**
 * Section for settings related to how the workspace is indexed for search and query purposes.
 */
export interface SettingsSectionProps {
	/**
	 * List of all setting keys that belong to this section, used for bulk scope actions.
	 */
	keys: readonly string[];

	/**
	 * Current state of all settings in this section, indexed by key. The section component uses this to read current values and pass them to child components.
	 */
	settings: Record<string, SettingState>;

	/**
	 * Handler for when a setting value is updated. The section component passes this to child components, which call it with the setting key and new value when the user makes changes in the UI.
	 * @param key The key of the setting being updated.
	 * @param value The new value for the setting.
	 */
	onUpdate: (key: string, value: unknown) => void;

	/**
	 * Handler for when a setting's scope is changed (e.g., from user to workspace). The section component passes this to child components, which call it with the setting key and new scope when the user changes the scope in the UI.
	 * @param key The key of the setting being updated.
	 * @param scope The new scope for the setting.
	 * @param currentValue The current value of the setting.
	 */
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;

	/**
	 * Handler for when multiple settings' scopes are changed at once (e.g., from user to workspace). The section component passes this to child components, which call it with the setting keys and new scope when the user changes the scope in the UI.
	 * @param keys The keys of the settings being updated.
	 * @param scope The new scope for the settings.
	 */
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}