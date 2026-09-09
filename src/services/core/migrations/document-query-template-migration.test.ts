import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { DocumentQueryTemplateMigration } from '@src/services/core/migrations/document-query-template-migration';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(),
}));

const OLD_KEY = 'language.sparql.documentQueryTemplate';
const NEW_KEY = 'sparql.documentQueryTemplate';

/**
 * Every value the retired setting has shipped as a default, read straight from git-tracked history
 * and mirrored in the migration. Each one must be dropped rather than carried over.
 */
const RETIRED_DEFAULTS = [
	'SELECT ?s ?p ?o\nFROM <{{documentUri}}>\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000',
	'---\nparams {\n  documentIri: iri\n}\n---\nSELECT ?s ?p ?o\nFROM ${documentIri}\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000',
	'---\nparams {\n  documentIri: iri\n}\nexample rdf {  documentIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n}\n---\nSELECT * WHERE { ${documentIri} ?p ?o }',
	'---\nparams {\n  documentIri: iri\n}\nexample rdf {\n  documentIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n}\n---\nSELECT * WHERE { ${documentIri} ?p ?o }',
];

const CUSTOM_TEMPLATE = '---\nparams {\n  documentIri: iri\n}\n---\nSELECT * WHERE { GRAPH ${documentIri} { ?s ?p ?o } } LIMIT 10';

/**
 * Builds a configuration double whose `inspect` returns the supplied per-scope values (keyed by
 * config key) and whose `update` records every call.
 */
function createConfig(inspectByKey: Record<string, any>) {
	const updates: { key: string; value: any; target: number }[] = [];

	const config = {
		inspect: vi.fn((key: string) => inspectByKey[key]),
		update: vi.fn(async (key: string, value: any, target: number) => {
			updates.push({ key, value, target });
		}),
	};

	return { config, updates };
}

async function useConfig(config: any) {
	const { getConfig } = await import('@src/utilities/vscode/config');
	(getConfig as any).mockReturnValue(config);
}

/**
 * Runs the migration against a configuration double built from the given inspect results.
 */
async function migrateWith(inspectByKey: Record<string, any>) {
	const { config, updates } = createConfig(inspectByKey);

	await useConfig(config);
	await new DocumentQueryTemplateMigration().migrate();

	return updates;
}

describe('DocumentQueryTemplateMigration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test.each(RETIRED_DEFAULTS)('clears a retired default without copying it forward (%#)', async (retired) => {
		const updates = await migrateWith({
			[OLD_KEY]: { globalValue: retired },
			[NEW_KEY]: {},
		});

		expect(updates).toEqual([
			{ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.Global },
		]);
	});

	test('ignores whitespace when recognising a retired default', async () => {
		const updates = await migrateWith({
			[OLD_KEY]: { globalValue: `\n${RETIRED_DEFAULTS[3]}\n` },
			[NEW_KEY]: {},
		});

		expect(updates.some(u => u.key === NEW_KEY)).toBe(false);
		expect(updates).toContainEqual({ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.Global });
	});

	test('copies a customized template to the new key and clears the old one', async () => {
		const updates = await migrateWith({
			[OLD_KEY]: { globalValue: CUSTOM_TEMPLATE },
			[NEW_KEY]: {},
		});

		expect(updates).toEqual([
			{ key: NEW_KEY, value: CUSTOM_TEMPLATE, target: vscode.ConfigurationTarget.Global },
			{ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.Global },
		]);
	});

	test('never overwrites a value already set on the new key', async () => {
		const updates = await migrateWith({
			[OLD_KEY]: { globalValue: CUSTOM_TEMPLATE },
			[NEW_KEY]: { globalValue: 'SELECT * WHERE { ?s ?p ?o }' },
		});

		expect(updates).toEqual([
			{ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.Global },
		]);
	});

	test('migrates each configuration scope independently', async () => {
		const updates = await migrateWith({
			[OLD_KEY]: {
				globalValue: RETIRED_DEFAULTS[3],
				workspaceValue: CUSTOM_TEMPLATE,
				workspaceFolderValue: RETIRED_DEFAULTS[1],
			},
			[NEW_KEY]: {},
		});

		expect(updates).toEqual([
			{ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.Global },
			{ key: NEW_KEY, value: CUSTOM_TEMPLATE, target: vscode.ConfigurationTarget.Workspace },
			{ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.Workspace },
			{ key: OLD_KEY, value: undefined, target: vscode.ConfigurationTarget.WorkspaceFolder },
		]);
	});

	test('is a no-op when the retired key is not persisted anywhere', async () => {
		const updates = await migrateWith({ [OLD_KEY]: {}, [NEW_KEY]: {} });

		expect(updates).toEqual([]);
	});

	test('is a no-op when the setting cannot be inspected at all', async () => {
		const updates = await migrateWith({});

		expect(updates).toEqual([]);
	});

	test('is idempotent: a second run after migrating changes nothing', async () => {
		await migrateWith({ [OLD_KEY]: { globalValue: CUSTOM_TEMPLATE }, [NEW_KEY]: {} });

		// The old key is cleared by the first run, so the second sees nothing to migrate.
		const updates = await migrateWith({
			[OLD_KEY]: {},
			[NEW_KEY]: { globalValue: CUSTOM_TEMPLATE },
		});

		expect(updates).toEqual([]);
	});

	test('mirrors every default the retired setting ever shipped', () => {
		// Guards against a future default being added to package.json without being retired here,
		// which would silently promote a broken template to the new key.
		const source = readFileSync(new URL('./document-query-template-migration.ts', import.meta.url), 'utf8');

		for (const retired of RETIRED_DEFAULTS) {
			expect(source).toContain(JSON.stringify(retired).slice(1, -1).replace(/\\"/g, '"'));
		}
	});
});
