import { LanguageId } from '@src/services/document/document-languages';

/**
 * Scope of a settings that correspond to the different levels of settings in VS Code.
 */
export type SettingScope = 'default' | 'user' | 'workspace';

/**
 * Identifies which "bucket" of VS Code configuration a setting lives in.
 *
 * - `mentor`: top-level `mentor.*` keys, read/written with the 3-arg
 *   `config.update(key, value, target)` form.
 * - `languageEditor`: `editor.*` keys nested inside a per-language override
 *   block (`[turtle]`, `[sparql]`, …), read/written with the 4-arg
 *   `config.update(key, value, target, overrideInLanguage=true)` form.
 */
export type SettingsSource =
	| { kind: 'mentor' }
	| { kind: 'languageEditor'; languageId: LanguageId };

/**
 * Stable string form of a `SettingsSource`, suitable for use as a map/object key.
 */
export function settingsSourceKey(source: SettingsSource): string {
	return source.kind === 'mentor' ? 'mentor' : `languageEditor:${source.languageId}`;
}

/**
 * Shared singleton for the `mentor` source — every section that only touches
 * `mentor.*` keys imports this rather than constructing the literal inline.
 */
export const MENTOR_SOURCE: SettingsSource = { kind: 'mentor' };

/**
 * The state of a setting, including its current value, default value, scope and additional metadata.
 */
export type SettingState = {
	/**
	 * The current value of the setting in the specified scope.
	 */
	value: unknown;

	/**
	 * The default value of the setting.
	 */
	defaultValue: unknown;

	/**
	 * The scope of the setting (e.g., user, workspace).
	 */
	scope: SettingScope;

	/**
	 * The value explicitly set at the User (global) scope, or `undefined` when unset.
	 * Exposed so per-item UIs can split a single key across scopes (e.g. store configs).
	 */
	userValue?: unknown;

	/**
	 * The value explicitly set at the Workspace scope, or `undefined` when unset.
	 * Exposed so per-item UIs can split a single key across scopes (e.g. store configs).
	 */
	workspaceValue?: unknown;

	/**
	 * The display name of the setting in the settings panel.
	 */
	title: string;

	/**
	 * A description of the setting, which can be displayed in the UI to provide more information to the user about what the setting does and how it should be used.
	 */
	description: string;

	/**
	 * Whether this setting is flagged experimental in package.json.
	 */
	experimental?: boolean;

	/**
	 * Enum options for top-level enum settings, populated by the host from package.json.
	 */
	enumOptions?: EnumOption[];
	
	/**
	 * Per-property enum options for object settings (e.g. `sorting.typeSortingOptions`).
	 */
	nestedEnumOptions?: Record<string, EnumOption[]>;
};

/**
 * An option for an enum setting, with a value and a human-readable label.
 */
export interface EnumOption {
	/**
	 * The actual value which is stored for the setting when this option is selected.
	 */
	value: string;

	/**
	 * A human-readable label for the option, which can be displayed in the UI (e.g., in a dropdown menu) to represent this option to the user.
	 */
	label: string;
}

/**
 * A leaf section in the settings UI which groups related settings together under a common label.
 */
export interface SettingsNavigationSectionConfig {
	/**
	 * A unique identifier for the section.
	 */
	id: string;

	/**
	 * The label that is displayed for the section in the UI.
	 */
	label: string;
}

/**
 * Groups related sections as a folder in the settings navigation tree.
 */
export interface SettingsNavigationGroupConfig {
	/**
	 * A unique identifier for the group.
	 */
	id: string;

	/**
	 * The label that is displayed for the group in the UI.
	 */
	label: string;

	/**
	 * The sections that belong to this group, which are displayed as child items under the group in the navigation tree.
	 */
	sections: SettingsNavigationSectionConfig[];
}

export type VSCodeSettings = Record<LanguageId, Record<string, SettingState>>;

export type TestResult = { success: boolean; error?: string } | null;