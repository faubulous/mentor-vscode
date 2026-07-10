import { SettingScope, SettingState, SettingsSource } from "./settings-types";
import { ScopeKey } from "@src/utilities/config-scope";

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
	 * Handler for when a setting value is updated. Receives a `source` discriminator so
	 * one callback can route both `mentor.*` keys and per-language `editor.*` overrides.
	 * @param source Which configuration bucket the key belongs to.
	 * @param key The key of the setting being updated.
	 * @param value The new value for the setting.
	 */
	onUpdate: (source: SettingsSource, key: string, value: unknown) => void;

	/**
	 * Handler for when a setting's scope is changed (e.g., from user to workspace).
	 * @param source Which configuration bucket the key belongs to.
	 * @param key The key of the setting being updated.
	 * @param scope The new scope for the setting.
	 * @param currentValue The current value of the setting.
	 */
	setScope: (source: SettingsSource, key: string, scope: SettingScope, currentValue: unknown) => void;

	/**
	 * Handler for when multiple settings' scopes are changed at once (e.g., from user to workspace).
	 * @param source Which configuration bucket the keys belong to.
	 * @param keys The keys of the settings being updated.
	 * @param scope The new scope for the settings.
	 */
	onBulkScope: (source: SettingsSource, keys: string[], scope: ScopeKey) => void;
}
