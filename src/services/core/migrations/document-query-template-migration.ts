import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { ISettingsMigration } from '../settings-migration.interface';

const OLD_KEY = 'language.sparql.documentQueryTemplate';
const NEW_KEY = 'sparql.documentQueryTemplate';

/**
 * Every value the retired setting has shipped as a default.
 *
 * A persisted value matching one of these is an untouched default rather than a customization, so
 * it is dropped instead of carried over — which is what lets the corrected graph-scoped default
 * take effect. All of them query the document IRI as a subject or via a stale `FROM` clause and
 * return nothing, so promoting one to the new key would silently preserve the defect.
 */
const RETIRED_DEFAULTS: readonly string[] = [
	'SELECT ?s ?p ?o\nFROM <{{documentUri}}>\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000',
	'---\nparams {\n  documentIri: iri\n}\n---\nSELECT ?s ?p ?o\nFROM ${documentIri}\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000',
	'---\nparams {\n  documentIri: iri\n}\nexample rdf {  documentIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n}\n---\nSELECT * WHERE { ${documentIri} ?p ?o }',
	'---\nparams {\n  documentIri: iri\n}\nexample rdf {\n  documentIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n}\n---\nSELECT * WHERE { ${documentIri} ?p ?o }',
];

/**
 * The configuration scopes to migrate, paired with the property on
 * {@link vscode.WorkspaceConfiguration.inspect} that exposes their per-scope value.
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
 * Indicates whether a persisted template is one of the retired shipped defaults, ignoring
 * surrounding whitespace so that a settings-editor round-trip is not mistaken for a customization.
 * @param value The persisted template text.
 * @returns `true` if the value is an untouched retired default.
 */
function isRetiredDefault(value: string): boolean {
	return RETIRED_DEFAULTS.some(template => template.trim() === value.trim());
}

/**
 * Migrates the retired `mentor.language.sparql.documentQueryTemplate` setting to the
 * store-overridable `mentor.sparql.documentQueryTemplate` query template.
 *
 * The retired defaults queried the document IRI as a subject, which never matches: workspace
 * documents are loaded as named graphs keyed by their workspace URI. A persisted value shadows the
 * shipped default, so upgrading alone would never refresh it. Per scope, an untouched default is
 * therefore cleared so the corrected default applies, while a genuine customization is preserved by
 * copying it to the new key. The old key is always cleared, so it does not linger as an unknown
 * configuration entry.
 *
 * Runs after {@link LegacyTemplateFormatMigration}, which strips pre-triplate placeholder values
 * from the old key first; the legacy default is listed above as well, so reordering the two is not
 * silently destructive.
 *
 * Idempotent: scopes that no longer define the old key are left untouched, and a value already set
 * on the new key is never overwritten.
 */
export class DocumentQueryTemplateMigration implements ISettingsMigration {
	readonly id = 'sparql.documentQueryTemplate';

	readonly description = 'Move `language.sparql.documentQueryTemplate` to the store-overridable `sparql.documentQueryTemplate` query, dropping the retired defaults so the corrected graph-scoped query applies.';

	async migrate(): Promise<void> {
		const config = getConfig();

		const oldInspect = config.inspect<string>(OLD_KEY);
		const newInspect = config.inspect<string>(NEW_KEY);

		if (!oldInspect) {
			return;
		}

		for (const scope of SCOPES) {
			const value = scope.valueOf(oldInspect);

			// Nothing to migrate for this scope.
			if (typeof value !== 'string') {
				continue;
			}

			// Carry over a customization only, and never shadow a value the user has already set
			// on the new key.
			if (!isRetiredDefault(value) && scope.valueOf(newInspect) === undefined) {
				await config.update(NEW_KEY, value, scope.target);
			}

			await config.update(OLD_KEY, undefined, scope.target);
		}
	}
}
