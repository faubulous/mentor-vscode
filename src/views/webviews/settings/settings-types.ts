/**
 * Static type definitions for the settings webview.
 * Generated data structures live in settings-metadata.ts (auto-generated).
 */

export type SettingScope = 'default' | 'user' | 'workspace';

export type SettingState = {
	value: unknown;
	defaultValue: unknown;
	source: SettingScope;
	title: string;
	description: string;
};

export interface EnumOption {
	value: string;
	label: string;
}

export interface SettingsNavigationSectionConfig {
	id: string;
	label: string;
}

export interface SettingsNavigationGroupConfig {
	id: string;
	label: string;
	sections: SettingsNavigationSectionConfig[];
}

/**
 * A catalog entry for a VS Code built-in setting that has no counterpart in
 * SETTINGS (e.g. tabSize, formatOnSave). All fields are required because these
 * entries have no runtime SettingState title/description to fall back on.
 */
export interface CatalogExtra {
	section: string;
	key: string;
	label: string;
	description: string;
}

/**
 * Compile-time metadata for a Mentor setting key, attached to entries in the
 * generated `SETTINGS` record.
 */
export interface SettingMetadata {
	section: import('./settings-metadata').SettingsNavigationSection;
	uiVisible: boolean;
	experimental?: boolean;
	enumOptions?: EnumOption[];
	nestedEnumOptions?: Record<string, EnumOption[]>;
}
