import * as vscode from 'vscode';

/**
 * Interface for the SettingsService.
 */
export interface ISettingsService {
	/**
	 * Subscribe to changes for a specific settings key.
	 * @param key The settings key to watch.
	 * @param callback The callback to invoke when the key changes.
	 */
	onDidChange(key: string, callback: (e: { key: string, oldValue: any, newValue: any }) => void): void;

	/**
	 * Return a value from this configuration.
	 * @param key Configuration variable name, supports _dotted_ names.
	 * @param defaultValue A value should be returned when no value could be found.
	 * @returns The value `section` denotes or the default.
	 */
	get<T>(key: string, defaultValue?: T): T | undefined;

	/**
	 * Set a value in this configuration.
	 * @param key Configuration variable name, supports _dotted_ names.
	 * @param value The value to be set for the configuration variable.
	 */
	set<T>(key: string, value: T): void;

	/**
	 * Check if this configuration has a certain value.
	 * @param key Configuration name, supports _dotted_ names.
	 * @returns `true` if the section doesn't resolve to `undefined`.
	 */
	has(key: string): boolean;
}
