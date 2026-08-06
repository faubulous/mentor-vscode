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

let predicatesCache: { label: string[]; description: string[] } | undefined;
let predicatesCacheWatcher: vscode.Disposable | undefined;

/**
 * The annotation predicates from the `mentor.predicates.*` settings, cached and
 * invalidated on configuration changes. Resolving resource labels reads these
 * per tree node / hover, and each raw configuration read deep-clones both
 * arrays — the cache keeps that off the hot path while setting changes still
 * apply immediately.
 */
export function getPredicatesConfig(): { label: string[]; description: string[] } {
	// One listener for the extension lifetime; disposed with the extension host.
	predicatesCacheWatcher ??= vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('mentor.predicates')) {
			predicatesCache = undefined;
		}
	});

	if (!predicatesCache) {
		const config = getConfig();

		predicatesCache = {
			label: config.get<string[]>('predicates.label') ?? [],
			description: config.get<string[]>('predicates.description') ?? [],
		};
	}

	return predicatesCache;
}


/**
 * The workspace-relative folder a preset's shapes are copied into when a
 * validation profile is created from it. Reads `mentor.shacl.shapesFolder`,
 * falling back to `.mentor/shapes`.
 * @returns The configured shapes folder as a workspace-relative POSIX path.
 */
export function getShapesFolder(): string {
	const folder = getConfig('shacl').get<string>('shapesFolder', '.mentor/shapes').trim();

	// Normalize away leading/trailing slashes so callers can join freely.
	return folder.replace(/^\/+|\/+$/g, '') || '.mentor/shapes';
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
 * Returns the first explicitly-configured value of an inspected `editor.*` key
 * across the user/workspace/folder scopes and their per-language `[languageId]`
 * override variants, or `undefined` when the key is only at its default. Unlike
 * `get()`, this ignores the value VS Code derives from `editor.detectIndentation`,
 * which lives on the editor model rather than the configuration.
 */
function explicitEditorValue<T>(inspected: ReturnType<vscode.WorkspaceConfiguration['inspect']>): T | undefined {
	return (inspected?.workspaceFolderLanguageValue
		?? inspected?.workspaceLanguageValue
		?? inspected?.globalLanguageValue
		?? inspected?.workspaceFolderValue
		?? inspected?.workspaceValue
		?? inspected?.globalValue) as T | undefined;
}

/**
 * Resolves the indentation string a document formatter should use.
 *
 * When the user has explicitly configured `editor.tabSize` or `editor.insertSpaces`
 * (including a per-language `[languageId]` override, which the Mentor settings UI
 * writes), the two are honored as a unit: the pair takes precedence over the
 * {@link vscode.FormattingOptions} VS Code passes to the formatter, and any half the
 * user did not set is filled from VS Code's own default rather than from those
 * options. This matters because the FormattingOptions are derived from the editor
 * model and therefore reflect `editor.detectIndentation` — so a file whose body
 * happens to be indented with tabs would otherwise force tab output even though the
 * user configured a spaces-based tab size (and vice versa). Falls back to the
 * FormattingOptions (respecting detection) only when neither setting is configured.
 * @param document The document being formatted.
 * @param options The FormattingOptions supplied by VS Code.
 * @returns The indentation string for one indent level.
 */
export function resolveFormattingIndent(document: vscode.TextDocument, options: vscode.FormattingOptions): string {
	const config = vscode.workspace.getConfiguration('editor', { languageId: document.languageId, uri: document.uri });

	const tabSizeInspect = config.inspect<number>('tabSize');
	const insertSpacesInspect = config.inspect<boolean>('insertSpaces');

	const explicitTabSize = explicitEditorValue<number>(tabSizeInspect);
	const explicitInsertSpaces = explicitEditorValue<boolean>(insertSpacesInspect);

	if (explicitTabSize !== undefined || explicitInsertSpaces !== undefined) {
		const tabSize = explicitTabSize ?? tabSizeInspect?.defaultValue as number ?? options.tabSize;
		const insertSpaces = explicitInsertSpaces ?? insertSpacesInspect?.defaultValue as boolean ?? options.insertSpaces;

		return insertSpaces ? ' '.repeat(tabSize) : '\t';
	}

	return options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
}