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
import { NotebookSerializer } from './notebook-serializer';

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
			expect(result.cells[0].metadata).toEqual({ connection: 'local' });
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
});
