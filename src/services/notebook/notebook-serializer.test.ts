import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') {
				return { subscriptions: [] };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { NotebookSerializer } from '@src/services/notebook/notebook-serializer';

const cancelToken = {} as vscode.CancellationToken;

function encode(value: string): Uint8Array {
	return new TextEncoder().encode(value);
}

function decode(data: Uint8Array): string {
	return new TextDecoder().decode(data);
}

let serializer: NotebookSerializer;

beforeEach(() => {
	vi.spyOn(vscode.workspace, 'registerNotebookSerializer').mockReturnValue({ dispose: vi.fn() });
	serializer = new NotebookSerializer();
});

describe('NotebookSerializer', () => {
	describe('deserializeNotebook', () => {
		it('should deserialize a notebook with code cells', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: 'SELECT * WHERE { ?s ?p ?o }' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells).toHaveLength(1);
			expect(result.cells[0].kind).toBe(vscode.NotebookCellKind.Code);
			expect(result.cells[0].languageId).toBe('sparql');
			expect(result.cells[0].value).toBe('SELECT * WHERE { ?s ?p ?o }');
		});

		it('should deserialize a notebook with markup cells', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Markup, language: 'markdown', value: '# Hello' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].kind).toBe(vscode.NotebookCellKind.Markup);
			expect(result.cells[0].languageId).toBe('markdown');
		});

		it('should preserve cell metadata', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: 'ASK {}', metadata: { connection: 'local' } },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			// The serializer adds slug fields; the original metadata properties must be preserved.
			expect(result.cells[0].metadata).toMatchObject({ connection: 'local' });
			expect(result.cells[0].metadata?.slug).toBeDefined();
		});

		it('should deserialize multiple cells maintaining order', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Markup, language: 'markdown', value: '# Title' },
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: 'SELECT * WHERE { ?s ?p ?o }' },
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '@prefix ex: <http://example.org/> .' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells).toHaveLength(3);
			expect(result.cells[0].languageId).toBe('markdown');
			expect(result.cells[1].languageId).toBe('sparql');
			expect(result.cells[2].languageId).toBe('turtle');
		});

		it('should return empty notebook for invalid JSON', async () => {
			const result = await serializer.deserializeNotebook(encode('not valid json'), cancelToken);
			expect(result.cells).toHaveLength(0);
		});

		it('should return empty notebook for empty input', async () => {
			const result = await serializer.deserializeNotebook(encode(''), cancelToken);
			expect(result.cells).toHaveLength(0);
		});
	});

	describe('serializeNotebook', () => {
		it('should serialize a notebook with code cells', async () => {
			const data = new vscode.NotebookData([
				new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'SELECT * WHERE { ?s ?p ?o }', 'sparql'),
			]);
			const result = await serializer.serializeNotebook(data, cancelToken);
			const parsed = JSON.parse(decode(result));
			expect(parsed.cells).toHaveLength(1);
			expect(parsed.cells[0].kind).toBe(vscode.NotebookCellKind.Code);
			expect(parsed.cells[0].language).toBe('sparql');
			expect(parsed.cells[0].value).toBe('SELECT * WHERE { ?s ?p ?o }');
		});

		it('should serialize cell metadata', async () => {
			const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'ASK {}', 'sparql');
			cell.metadata = { connection: 'local' };
			const data = new vscode.NotebookData([cell]);
			const result = await serializer.serializeNotebook(data, cancelToken);
			const parsed = JSON.parse(decode(result));
			expect(parsed.cells[0].metadata).toEqual({ connection: 'local' });
		});

		it('should serialize multiple cells maintaining order', async () => {
			const data = new vscode.NotebookData([
				new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, '# Title', 'markdown'),
				new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'SELECT * WHERE { ?s ?p ?o }', 'sparql'),
			]);
			const result = await serializer.serializeNotebook(data, cancelToken);
			const parsed = JSON.parse(decode(result));
			expect(parsed.cells).toHaveLength(2);
			expect(parsed.cells[0].language).toBe('markdown');
			expect(parsed.cells[1].language).toBe('sparql');
		});

		it('should produce output that round-trips through deserializeNotebook', async () => {
			const original = new vscode.NotebookData([
				new vscode.NotebookCellData(vscode.NotebookCellKind.Code, 'SELECT * WHERE { ?s ?p ?o }', 'sparql'),
				new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, '# Notes', 'markdown'),
			]);
			const serialized = await serializer.serializeNotebook(original, cancelToken);
			const deserialized = await serializer.deserializeNotebook(serialized, cancelToken);
			expect(deserialized.cells).toHaveLength(2);
			expect(deserialized.cells[0].value).toBe('SELECT * WHERE { ?s ?p ?o }');
			expect(deserialized.cells[0].languageId).toBe('sparql');
			expect(deserialized.cells[1].value).toBe('# Notes');
			expect(deserialized.cells[1].languageId).toBe('markdown');
		});
	});

	describe('slug assignment', () => {
		it('assigns an auto-slug to a cell that has no slug', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].metadata?.slug).toBe('cell-1');
			expect(result.cells[0].metadata?.slugIsAuto).toBe(true);
		});

		it('assigns sequential auto-slugs to multiple cells without slugs', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '' },
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: '' },
					{ kind: vscode.NotebookCellKind.Markup, language: 'markdown', value: '' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].metadata?.slug).toBe('cell-1');
			expect(result.cells[1].metadata?.slug).toBe('cell-2');
			expect(result.cells[2].metadata?.slug).toBe('cell-3');
			expect(result.cells.every(c => c.metadata?.slugIsAuto)).toBe(true);
		});

		it('preserves a valid explicit slug', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '', metadata: { slug: 'my-ontology', slugIsAuto: false } },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].metadata?.slug).toBe('my-ontology');
			expect(result.cells[0].metadata?.slugIsAuto).toBeFalsy();
		});

		it('auto-slugs a cell with an invalid slug format', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '', metadata: { slug: 'Invalid Slug!', slugIsAuto: false } },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].metadata?.slug).toBe('cell-1');
			expect(result.cells[0].metadata?.slugIsAuto).toBe(true);
		});

		it('auto-slugs a cell whose explicit slug conflicts with another explicit slug', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '', metadata: { slug: 'same-slug', slugIsAuto: false } },
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '', metadata: { slug: 'same-slug', slugIsAuto: false } },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			// Both should get auto-slugs since neither was unique
			expect(result.cells[0].metadata?.slugIsAuto).toBe(true);
			expect(result.cells[1].metadata?.slugIsAuto).toBe(true);
			expect(result.cells[0].metadata?.slug).not.toBe(result.cells[1].metadata?.slug);
		});

		it('continues the cell counter from the stored notebook metadata', async () => {
			const raw = {
				metadata: { cellCounter: 7 },
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].metadata?.slug).toBe('cell-8');
		});

		it('persists cellCounter in notebook metadata when serializing', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '' },
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: '' },
				],
			};
			// Deserialize to assign slugs (counter becomes 2)
			const deserialized = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			// Serialize back
			const serialized = await serializer.serializeNotebook(deserialized, cancelToken);
			const parsed = JSON.parse(decode(serialized));
			expect(parsed.metadata?.cellCounter).toBe(2);
		});

		it('does not reuse a counter value after a round-trip (monotonic guarantee)', async () => {
			const raw = {
				cells: [
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '' },
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: '' },
				],
			};
			// First round-trip: assigns cell-1 and cell-2, counter=2
			const first = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			const firstSerialized = await serializer.serializeNotebook(first, cancelToken);

			// Simulate adding a new cell (no slug) and round-tripping again
			const parsed = JSON.parse(decode(firstSerialized));
			parsed.cells.push({ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '' });

			const second = await serializer.deserializeNotebook(encode(JSON.stringify(parsed)), cancelToken);
			expect(second.cells[2].metadata?.slug).toBe('cell-3');
		});

		it('auto-slug does not collide with an existing explicit slug', async () => {
			const raw = {
				cells: [
					// Explicit slug 'cell-1' — the auto-slug generator must skip this
					{ kind: vscode.NotebookCellKind.Code, language: 'turtle', value: '', metadata: { slug: 'cell-1', slugIsAuto: false } },
					{ kind: vscode.NotebookCellKind.Code, language: 'sparql', value: '' },
				],
			};
			const result = await serializer.deserializeNotebook(encode(JSON.stringify(raw)), cancelToken);
			expect(result.cells[0].metadata?.slug).toBe('cell-1');
			expect(result.cells[1].metadata?.slug).not.toBe('cell-1');
		});
	});
});

