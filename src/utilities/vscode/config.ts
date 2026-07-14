import * as vscode from 'vscode';
import { ConfigurationScope, ScopeKey, keyToScope } from '../config-scope';

/**
 * Converts a Mentor {@link ConfigurationScope} or {@link ScopeKey} into the VS Code
 * configuration target to write to. The numeric {@link ConfigurationScope} values
 * deliberately equal their `vscode.ConfigurationTarget` counterparts; this helper
 * keeps that invariant in one place.
 * @param scope A configuration scope or its serializable key.
 * @returns The corresponding VS Code configuration target.
 */
export function toConfigurationTarget(scope: ConfigurationScope | ScopeKey): vscode.ConfigurationTarget {
	const value = typeof scope === 'string' ? keyToScope(scope) : scope;

	return value === ConfigurationScope.User
		? vscode.ConfigurationTarget.Global
		: vscode.ConfigurationTarget.Workspace;
}

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
 * The language override keys are declared without an explicit `default` in
 * `package.json`, but VS Code still synthesizes a type-based default
 * (`false`/`0`/`''`) for any registered key. `get()` therefore never returns
 * `undefined` for them, which would make the override always win and hide the
 * common value. We instead read the override via `inspect()` and honor it only
 * when the user actually set it at the global, workspace or folder scope.
 * @param language The formatting language id (e.g. `'turtle'`, `'sparql'`).
 * @param key The option key (e.g. `'maxLineWidth'`).
 * @param fallback The value to use when neither override nor common is set.
 * @returns The effective option value.
 */
export function resolveFormattingConfig<T>(language: string, key: string, fallback: T): T {
	const inspected = getConfig(`formatting.${language}`).inspect<T>(key);

	const override = inspected?.workspaceFolderValue
		?? inspected?.workspaceValue
		?? inspected?.globalValue;

	if (override !== undefined) {
		return override;
	}

	return getConfig('formatting.common').get<T>(key, fallback);
}

/**
 * Returns the first explicitly-configured value of an `editor.*` key across the
 * user/workspace/folder scopes and their per-language `[languageId]` override
 * variants, or `undefined` when the key is only at its default. Unlike `get()`,
 * this ignores the value VS Code derives from `editor.detectIndentation`, which
 * lives on the editor model rather than the configuration.
 */
function resolveExplicitEditorValue<T>(config: vscode.WorkspaceConfiguration, key: string): T | undefined {
	const inspected = config.inspect<T>(key);

	return inspected?.workspaceFolderLanguageValue
		?? inspected?.workspaceLanguageValue
		?? inspected?.globalLanguageValue
		?? inspected?.workspaceFolderValue
		?? inspected?.workspaceValue
		?? inspected?.globalValue;
}

/**
 * Resolves the indentation string a document formatter should use.
 *
 * An explicitly configured `editor.tabSize` / `editor.insertSpaces` (including a
 * per-language `[languageId]` override, which the Mentor settings UI writes)
 * takes precedence, because the {@link vscode.FormattingOptions} VS Code passes
 * to a formatter are derived from the editor model and therefore reflect
 * `editor.detectIndentation` — which would otherwise ignore the configured
 * values for a file whose existing indentation was auto-detected. Falls back to
 * the FormattingOptions (respecting detection) when nothing is configured.
 * @param document The document being formatted.
 * @param options The FormattingOptions supplied by VS Code.
 * @returns The indentation string for one indent level.
 */
export function resolveFormattingIndent(document: vscode.TextDocument, options: vscode.FormattingOptions): string {
	const config = vscode.workspace.getConfiguration('editor', { languageId: document.languageId, uri: document.uri });

	const tabSize = resolveExplicitEditorValue<number>(config, 'tabSize') ?? options.tabSize;
	const insertSpaces = resolveExplicitEditorValue<boolean>(config, 'insertSpaces') ?? options.insertSpaces;

	return insertSpaces ? ' '.repeat(tabSize) : '\t';
}