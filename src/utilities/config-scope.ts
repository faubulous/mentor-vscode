/**
 * List of configuration targets supported by Mentor. The values correspond to
 * the VS Code ConfigurationTarget enum (https://code.visualstudio.com/api/references/vscode-api#ConfigurationTarget).
 * But we define our own enum here to avoid a dependency on the 'vscode' module for webviews and LSP processes.
 */
export enum ConfigurationScope {
	User = 1,
	Workspace = 2
}

/**
 * String form of a {@link ConfigurationScope}, used as a serializable
 * discriminator in webview messages, settings-panel state and section
 * descriptors.
 */
export type ScopeKey = 'user' | 'workspace';

/**
 * Converts a {@link ConfigurationScope} into its serializable {@link ScopeKey}.
 * @param scope A configuration scope value.
 * @returns The corresponding scope key.
 */
export function scopeToKey(scope: ConfigurationScope): ScopeKey {
	return scope === ConfigurationScope.User ? 'user' : 'workspace';
}

/**
 * Converts a serializable {@link ScopeKey} back into its {@link ConfigurationScope}.
 * @param key A scope key.
 * @returns The corresponding configuration scope.
 */
export function keyToScope(key: ScopeKey): ConfigurationScope {
	return key === 'user' ? ConfigurationScope.User : ConfigurationScope.Workspace;
}

/**
 * Get a label for a configuration scope.
 * @param scope A configuration scope value.
 * @returns A string label for the configuration scope.
 */
export const getConfigurationScopeLabel = (scope: ConfigurationScope) => {
	switch (scope) {
		case ConfigurationScope.User:
			return 'User';
		case ConfigurationScope.Workspace:
			return 'Workspace';
		default:
			return 'Unknown';
	}
};

/**
 * Get a description for a configuration scope.
 * @param scope A configuration scope value.
 * @returns A string description of the configuration scope.
 */
export const getConfigurationScopeDescription = (scope: ConfigurationScope) => {
	switch (scope) {
		case ConfigurationScope.User:
			return 'The settings will be available in all Visual Studio Code sessions on your local machine.';
		case ConfigurationScope.Workspace:
			return 'The settings are stored in the .vscode folder. All connection parameters except secrets can be shared with version control.';
		default:
			return '';
	}
}