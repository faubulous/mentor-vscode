import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('triplate', () => ({
	isTemplate: (text: string) => /^---[ \t]*\r?\n/.test(text),
	compile: vi.fn((_text: string) => ({
		schema: {
			params: [
				{ name: 'type', type: { base: { kind: 'iri' }, array: false, optional: false } },
				{ name: 'graphIris', type: { base: { kind: 'iri' }, array: true, optional: true } },
				{ name: 'limit', type: { base: { kind: 'int' }, array: false, optional: true } },
			]
		}
	}))
}));

import { TriplateHoverProvider } from './triplate-hover-provider';

const FRONTMATTER = '---\nparams {\n  type: iri\n  graphIris: iri[] optional\n  limit: int optional\n}\n---\n';

function makeDoc(text: string, version = 1) {
	const lines = text.split('\n');

	return {
		getText: () => text,
		uri: vscode.Uri.parse('file:///test.sparql'),
		version,
		offsetAt: (pos: vscode.Position) => {
			let offset = 0;

			for (let i = 0; i < pos.line; i++) {
				offset += lines[i].length + 1;
			}

			return offset + pos.character;
		},
	} as unknown as vscode.TextDocument;
}

function positionOf(text: string, substring: string): vscode.Position {
	const idx = text.indexOf(substring);
	const before = text.slice(0, idx);
	const lines = before.split('\n');
	const line = lines.length - 1;
	const character = lines[line].length;
	return new vscode.Position(line, character);
}

describe('TriplateHoverProvider', () => {
	let provider: TriplateHoverProvider;

	beforeEach(() => {
		provider = new TriplateHoverProvider();
	});

	it('returns null for non-template documents', () => {
		const doc = makeDoc('SELECT ?s WHERE { ?s ?p ?o }');
		const pos = new vscode.Position(0, 5);
		expect(provider.provideHover(doc, pos)).toBeNull();
	});

	it('returns null when hovering outside any interpolation', () => {
		const text = FRONTMATTER + 'SELECT * WHERE { ?s a ${type} . }';
		const doc = makeDoc(text);
		const pos = positionOf(text, 'SELECT *');
		expect(provider.provideHover(doc, pos)).toBeNull();
	});

	it('returns a hover with param name and type when on ${type}', () => {
		const text = FRONTMATTER + 'SELECT * WHERE { ?s a ${type} . }';
		const doc = makeDoc(text);
		const pos = positionOf(text, '${type}');
		const result = provider.provideHover(doc, pos) as vscode.Hover;

		expect(result).not.toBeNull();
		expect(result.contents).toBeDefined();
	});

	it('hover content includes the param name', () => {
		const text = FRONTMATTER + 'SELECT * WHERE { ?s a ${type} . }';
		const doc = makeDoc(text);
		const pos = positionOf(text, '${type}');
		const result = provider.provideHover(doc, pos) as vscode.Hover;
		const md = result.contents as vscode.MarkdownString;

		expect(md.value).toContain('**type**');
		expect(md.value).toContain('iri');
		expect(md.value).not.toContain('optional');
	});

	it('hover content shows array type for array params', () => {
		const text = FRONTMATTER + 'FROM ${graphIris}';
		const doc = makeDoc(text);
		const pos = positionOf(text, '${graphIris}');
		const result = provider.provideHover(doc, pos) as vscode.Hover;
		const md = result.contents as vscode.MarkdownString;

		expect(md.value).toContain('**graphIris**');
		expect(md.value).toContain('iri[]');
		expect(md.value).toContain('optional');
	});

	it('hover content shows optional for optional params', () => {
		const text = FRONTMATTER + 'LIMIT ${limit}';
		const doc = makeDoc(text);
		const pos = positionOf(text, '${limit}');
		const result = provider.provideHover(doc, pos) as vscode.Hover;
		const md = result.contents as vscode.MarkdownString;

		expect(md.value).toContain('**limit**');
		expect(md.value).toContain('int');
		expect(md.value).toContain('optional');
	});

	it('returns null when param name not found in schema', () => {
		const text = FRONTMATTER + 'SELECT * WHERE { ${unknown} ?p ?o }';
		const doc = makeDoc(text);
		const pos = positionOf(text, '${unknown}');
		expect(provider.provideHover(doc, pos)).toBeNull();
	});

	it('returns null when compile throws (no schema available)', async () => {
		const { compile } = await import('triplate');
		(compile as ReturnType<typeof vi.fn>).mockImplementationOnce(() => { throw new Error('parse error'); });

		const text = '---\nmalformed\n---\nSELECT * WHERE { ${type} ?p ?o }';
		const doc = makeDoc(text);
		const pos = positionOf(text, '${type}');
		expect(provider.provideHover(doc, pos)).toBeNull();
	});

	it('returns cached result on second hover in same document version', async () => {
		const { compile } = await import('triplate');
		const compileSpy = compile as ReturnType<typeof vi.fn>;
		compileSpy.mockClear();

		const text = FRONTMATTER + 'SELECT * WHERE { ?s a ${type} . }';
		const doc = makeDoc(text, 5);
		const pos = positionOf(text, '${type}');

		provider.provideHover(doc, pos);
		provider.provideHover(doc, pos);

		expect(compileSpy).toHaveBeenCalledTimes(1);
	});
});
