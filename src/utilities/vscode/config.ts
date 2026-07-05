import * as vscode from 'vscode';

/**
 * Retrieves the VS Code configuration section for the Mentor extension.
 * @returns The Mentor extension configuration.
 */
export function getConfig(section: string = ''): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration(`mentor${section ? `.${section}` : ''}`);
}


/**
 * Resolves a formatting option using the cascading model: a language-specific
 * override (`mentor.formatting.<language>.<key>`) wins when explicitly set,
 * otherwise the shared common value (`mentor.formatting.common.<key>`) is used,
 * falling back to {@link fallback} when neither is configured.
 *
 * Language override keys are declared without a `default` in `package.json`, so
 * `get()` returns `undefined` precisely when the user has not set them.
 * @param language The formatting language id (e.g. `'turtle'`, `'sparql'`).
 * @param key The option key (e.g. `'maxLineWidth'`).
 * @param fallback The value to use when neither override nor common is set.
 * @returns The effective option value.
 */
export function resolveFormattingConfig<T>(language: string, key: string, fallback: T): T {
	const override = getConfig(`formatting.${language}`).get<T>(key);

	if (override !== undefined) {
		return override;
	} else {
		return getConfig('formatting.common').get<T>(key, fallback);
	}
}