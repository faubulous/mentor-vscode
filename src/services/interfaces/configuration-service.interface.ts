import * as vscode from 'vscode';

/**
 * Interface for the ConfigurationService.
 */
export interface IConfigurationService {
	/**
	 * Get the workspace configuration for the Mentor extension.
	 */
	readonly config: vscode.WorkspaceConfiguration;

	/**
	 * Return a value from the configuration, or undefined if it doesn't exist.
	 * @param key The key of the configuration value to get.
	 * @param defaultValue An optional default value to return if the configuration value is not set.
	 */
	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;

	/**
	 * Gets the list of patterns to exclude from indexing operations.
	 * @param workspaceUri The workspace URI to get patterns for.
	 * @returns An array of glob patterns to exclude.
	 */
	getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]>;
}
