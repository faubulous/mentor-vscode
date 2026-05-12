/**
 * Static type definitions for the settings webview.
 * Generated data structures live in settings-metadata.ts (auto-generated).
 */

export interface EnumOption {
	value: string;
	label: string;
}

export interface NavSectionConfig {
	id: string;
	label: string;
}

export interface NavGroupConfig {
	id: string;
	label: string;
	sections: NavSectionConfig[];
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
