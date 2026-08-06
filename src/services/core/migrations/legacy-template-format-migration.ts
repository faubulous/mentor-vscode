import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { ISettingsMigration } from '../settings-migration.interface';

/**
 * The default document/query template settings that switched from the legacy
 * Mustache-style placeholder syntax (`{{name}}`, `<@name>`) to the triplate
 * format (`---` typed frontmatter plus `${name}` substitutions and `{% %}`
 * directives).
 *
 * Only the *rendered* templates actually break in the old format, but the same
 * detection is applied to every template setting: a value carrying a legacy
 * placeholder is unambiguously outdated, while static templates (which contain
 * no placeholder at all) are never matched — so listing them all is safe.
 */
const TEMPLATE_KEYS: readonly string[] = [
	'language.sparql.defaultDocumentTemplate',
	'language.sparql.documentQueryTemplate',
	'language.turtle.defaultDocumentTemplate',
	'language.trig.defaultDocumentTemplate',
	'language.n3.defaultDocumentTemplate',
	'language.ntriples.defaultDocumentTemplate',
	'language.nquads.defaultDocumentTemplate',
	'sparql.listGraphsQuery',
	'sparql.dropGraphQuery',
	'sparql.describeQueryTemplate',
	'sparql.exportGraphQuery',
	'sparql.countGraphQuery',
];

/**
 * The configuration scopes whose persisted value is inspected and, when legacy,
 * cleared. Paired with the property on {@link vscode.WorkspaceConfiguration.inspect}
 * that exposes each scope's value.
 */
const SCOPES: ReadonlyArray<{
	target: vscode.ConfigurationTarget;
	valueOf: (i: ReturnType<vscode.WorkspaceConfiguration['inspect']>) => unknown;
}> = [
	{ target: vscode.ConfigurationTarget.Global, valueOf: i => i?.globalValue },
	{ target: vscode.ConfigurationTarget.Workspace, valueOf: i => i?.workspaceValue },
	{ target: vscode.ConfigurationTarget.WorkspaceFolder, valueOf: i => i?.workspaceFolderValue },
];

/**
 * Matches a legacy template placeholder: Mustache-style `{{name}}` or the oldest
 * `<@name>` form. Triplate uses `${name}` and `{% %}` and never `{{`, so a value
 * containing either token is definitively a pre-triplate template.
 */
const LEGACY_PLACEHOLDER_RE = /\{\{[^}]*\}\}|<@\w/;

/**
 * Clears user-persisted default document/query template settings that still use
 * the legacy `{{…}}` / `<@…>` placeholder syntax, so they fall back to the
 * current triplate-format defaults shipped in `package.json`.
 *
 * A pre-installed or previously edited extension may have written these template
 * settings into `settings.json` (e.g. via the settings-UI template editor). That
 * persisted value shadows the package.json default, so upgrading the extension
 * never refreshes it — leaving e.g. `language.sparql.documentQueryTemplate` in a
 * form that `triplate.render` cannot substitute, which breaks the
 * "create query from document" command.
 *
 * Idempotent: only legacy-format values are removed; triplate-format values
 * (which contain no legacy placeholder), static templates, and unset scopes are
 * all left untouched.
 */
export class LegacyTemplateFormatMigration implements ISettingsMigration {
	readonly id = 'sparql.legacy-template-format';

	readonly description = 'Reset legacy `{{…}}`/`<@…>` document/query templates so they fall back to the current triplate-format defaults.';

	async migrate(): Promise<void> {
		const config = getConfig();

		for (const key of TEMPLATE_KEYS) {
			const inspected = config.inspect<string>(key);

			if (!inspected) {
				continue;
			}

			for (const scope of SCOPES) {
				const value = scope.valueOf(inspected);

				if (typeof value === 'string' && LEGACY_PLACEHOLDER_RE.test(value)) {
					// Clearing the override restores the shipped triplate default and lets
					// future default changes propagate automatically.
					await config.update(key, undefined, scope.target);
				}
			}
		}
	}
}
