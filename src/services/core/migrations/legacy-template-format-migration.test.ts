import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { render } from 'triplate';
import { LegacyTemplateFormatMigration } from '@src/services/core/migrations/legacy-template-format-migration';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(),
}));

/**
 * Builds a configuration double whose `inspect` returns the supplied per-scope
 * values (keyed by config key) and whose `update` records every call.
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

const DOCUMENT_QUERY_KEY = 'language.sparql.documentQueryTemplate';

/**
 * The pre-triplate `documentQueryTemplate` default a pre-installed extension may
 * have persisted into settings.json. Mustache placeholder, no `---` frontmatter.
 */
const LEGACY_DOCUMENT_QUERY_TEMPLATE = 'SELECT ?s ?p ?o\nFROM <{{documentUri}}>\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000';

/**
 * The oldest `<@name>` placeholder form (e.g. the original `dropGraphQuery`).
 */
const LEGACY_DROP_GRAPH_QUERY = 'DROP GRAPH <@graphIri>';

describe('LegacyTemplateFormatMigration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('clears a legacy documentQueryTemplate persisted at global scope', async () => {
		const { config, updates } = createConfig({
			[DOCUMENT_QUERY_KEY]: { globalValue: LEGACY_DOCUMENT_QUERY_TEMPLATE },
		});
		await useConfig(config);

		await new LegacyTemplateFormatMigration().migrate();

		expect(updates).toContainEqual({
			key: DOCUMENT_QUERY_KEY,
			value: undefined,
			target: vscode.ConfigurationTarget.Global,
		});
	});

	test('clears the oldest <@name> placeholder form (dropGraphQuery)', async () => {
		const { config, updates } = createConfig({
			'sparql.dropGraphQuery': { workspaceValue: LEGACY_DROP_GRAPH_QUERY },
		});
		await useConfig(config);

		await new LegacyTemplateFormatMigration().migrate();

		expect(updates).toContainEqual({
			key: 'sparql.dropGraphQuery',
			value: undefined,
			target: vscode.ConfigurationTarget.Workspace,
		});
	});

	test('clears legacy values in every scope that defines one', async () => {
		const { config, updates } = createConfig({
			[DOCUMENT_QUERY_KEY]: {
				globalValue: LEGACY_DOCUMENT_QUERY_TEMPLATE,
				workspaceValue: LEGACY_DOCUMENT_QUERY_TEMPLATE,
			},
		});
		await useConfig(config);

		await new LegacyTemplateFormatMigration().migrate();

		const clearedTargets = updates
			.filter(u => u.key === DOCUMENT_QUERY_KEY && u.value === undefined)
			.map(u => u.target);

		expect(clearedTargets).toEqual(
			expect.arrayContaining([vscode.ConfigurationTarget.Global, vscode.ConfigurationTarget.Workspace])
		);
	});

	test('leaves a triplate-format value untouched (idempotent)', async () => {
		const triplateValue = '---\nparams {\n  documentIri: iri\n}\n---\nSELECT * WHERE { ${documentIri} ?p ?o }';
		const { config, updates } = createConfig({
			[DOCUMENT_QUERY_KEY]: { globalValue: triplateValue },
		});
		await useConfig(config);

		await new LegacyTemplateFormatMigration().migrate();

		expect(updates).toHaveLength(0);
	});

	test('leaves a static template without placeholders untouched', async () => {
		const staticTemplate = 'SELECT ?s ?p ?o\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000';
		const { config, updates } = createConfig({
			'language.sparql.defaultDocumentTemplate': { globalValue: staticTemplate },
		});
		await useConfig(config);

		await new LegacyTemplateFormatMigration().migrate();

		expect(updates).toHaveLength(0);
	});

	test('is a no-op when no template setting is persisted', async () => {
		const { config, updates } = createConfig({
			[DOCUMENT_QUERY_KEY]: {},
		});
		await useConfig(config);

		await new LegacyTemplateFormatMigration().migrate();

		expect(updates).toHaveLength(0);
	});
});

/**
 * Reads a setting's shipped `default` value straight from package.json,
 * resolved relative to this test file so it is independent of the working dir.
 */
function readShippedDefault(fullKey: string): string {
	const pkg = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8'));
	const configuration = pkg.contributes.configuration;
	const sections = Array.isArray(configuration) ? configuration : [configuration];

	for (const section of sections) {
		const property = section.properties?.[fullKey];

		if (property) {
			return property.default;
		}
	}

	throw new Error(`Setting "${fullKey}" not found in package.json`);
}

describe('documentQueryTemplate default — create-query-from-document contract', () => {
	// Guards the exact contract of `createSparqlQueryFromDocument`:
	// `render(getConfig().get('language.sparql.documentQueryTemplate'), { documentIri })`.
	test('the shipped default renders and substitutes the document IRI via triplate', () => {
		const template = readShippedDefault('mentor.language.sparql.documentQueryTemplate');

		const rendered = render(template, { documentIri: 'http://example.org/doc' });

		expect(rendered).toContain('http://example.org/doc');
		expect(rendered).not.toContain('${');
		expect(rendered).not.toContain('{{');
	});

	test('the legacy value cannot produce a usable query (why the migration exists)', () => {
		let rendered: string | undefined;

		try {
			rendered = render(LEGACY_DOCUMENT_QUERY_TEMPLATE, { documentIri: 'http://example.org/doc' });
		} catch {
			// Triplate rejects the legacy format outright.
			rendered = undefined;
		}

		// Either triplate throws, or it leaves the placeholder unsubstituted — in no
		// case does the legacy value yield a valid query with the IRI filled in.
		expect(rendered === undefined || rendered.includes('{{documentUri}}')).toBe(true);
	});
});
