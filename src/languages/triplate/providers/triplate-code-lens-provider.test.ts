import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('triplate', () => ({
	isTemplate: (text: string) => /^---[ \t]*\r?\n/.test(text),
	compile: vi.fn((_text: string) => ({
		schema: { params: [] },
		examples: [
			{ id: 'people', description: 'People example', bindings: {}, line: 3, column: 1 },
			{ id: 'orgs', bindings: {}, line: 6, column: 1 },
		],
	})),
}));

import { TriplateCodeLensProvider } from './triplate-code-lens-provider';
import { createMockTextDocument } from '@src/utilities/mocks/factories';

function makeDoc(text: string, languageId = 'turtle', version = 1, uri = 'file:///test.ttl') {
	return createMockTextDocument(text, { uri, languageId, version });
}

const FRONTMATTER =
	'---\nparams { type: iri }\nexample people {\n  type: <http://example.org/Person>\n}\nexample orgs {\n  type: <http://example.org/Org>\n}\n---\nSELECT * WHERE { ?s a ${type} }';

describe('TriplateCodeLensProvider', () => {
	let provider: TriplateCodeLensProvider;

	beforeEach(() => {
		provider = new TriplateCodeLensProvider();
	});

	it('returns no lenses for non-template documents', () => {
		const doc = makeDoc('SELECT ?s WHERE { ?s ?p ?o }');
		expect(provider.provideCodeLenses(doc)).toEqual([]);
	});

	it('returns a single Execute lens for a template with no examples', async () => {
		const { compile } = await import('triplate');
		(compile as ReturnType<typeof vi.fn>).mockReturnValueOnce({ schema: { params: [] }, examples: [] });

		const doc = makeDoc('---\nparams { type: iri }\n---\nSELECT * WHERE {}');
		const lenses = provider.provideCodeLenses(doc);

		expect(lenses).toHaveLength(1);
		expect(lenses[0].command?.command).toBe('mentor.command.executeTriplateTemplate');
		expect(lenses[0].command?.arguments).toEqual(['file:///test.ttl']);
	});

	it('returns the top lens plus one Run lens per example block', () => {
		const doc = makeDoc(FRONTMATTER);
		const lenses = provider.provideCodeLenses(doc);

		// 1 top-of-file Run lens + a Run lens for each of the two examples.
		expect(lenses).toHaveLength(3);

		const exampleLenses = lenses.slice(1);
		expect(exampleLenses.map(l => l.command?.command)).toEqual([
			'mentor.command.executeTriplateExample',
			'mentor.command.executeTriplateExample',
		]);
		expect(exampleLenses.map(l => l.command?.arguments)).toEqual([
			['file:///test.ttl', 'people'],
			['file:///test.ttl', 'orgs'],
		]);
	});

	it('places each example lens on its declaration line', () => {
		const doc = makeDoc(FRONTMATTER);
		const lenses = provider.provideCodeLenses(doc);

		// 'example people' is on line index 2, 'example orgs' on line index 5.
		expect(lenses[1].range.start.line).toBe(2);
		expect(lenses[2].range.start.line).toBe(5);
	});

	it('omits its own top-of-file Run lens for SPARQL templates (SparqlCodeLensProvider supplies it)', () => {
		const doc = makeDoc(FRONTMATTER, 'sparql');
		const lenses = provider.provideCodeLenses(doc);

		// Only the per-example Run lenses; SparqlCodeLensProvider supplies the top-of-file
		// Run lens for `.sparql`-language documents so it reliably ends up first.
		expect(lenses).toHaveLength(2);
		expect(lenses.every(l => l.command?.command === 'mentor.command.executeTriplateExample')).toBe(true);
	});

	it('shows the top-of-file Run lens in notebook cells (consistent with the editor)', () => {
		const doc = makeDoc(FRONTMATTER, 'turtle', 1, 'vscode-notebook-cell:///nb.ttl#c1');
		const lenses = provider.provideCodeLenses(doc);

		// 1 top-of-file Run lens + a Run lens for each of the two examples, just like
		// in a standalone editor.
		expect(lenses).toHaveLength(3);
		expect(lenses[0].command?.command).toBe('mentor.command.executeTriplateTemplate');
		expect(lenses.slice(1).every(l => l.command?.command === 'mentor.command.executeTriplateExample')).toBe(true);
	});

	it('emits only the top Execute lens when compile throws', async () => {
		const { compile } = await import('triplate');
		(compile as ReturnType<typeof vi.fn>).mockImplementationOnce(() => { throw new Error('parse error'); });

		const doc = makeDoc(FRONTMATTER);
		const lenses = provider.provideCodeLenses(doc);

		expect(lenses).toHaveLength(1);
		expect(lenses[0].command?.command).toBe('mentor.command.executeTriplateTemplate');
	});
});
