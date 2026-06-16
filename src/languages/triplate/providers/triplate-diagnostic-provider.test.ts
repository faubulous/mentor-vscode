import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('triplate', () => {
	class TriplateError extends Error {
		line?: number;
		column?: number;
		constructor(message: string, line?: number, column?: number) {
			super(message);
			this.line = line;
			this.column = column;
		}
	}
	return { compile: vi.fn(), isTemplate: (text: string) => /^---[ \t]*\r?\n/.test(text), TriplateError };
});

import { TriplateDiagnosticProvider } from './triplate-diagnostic-provider';

function makeDoc(text: string, languageId = 'sparql') {
	const lines = text.split('\n');

	return {
		getText: () => text,
		uri: vscode.Uri.parse('file:///test.sparql'),
		languageId,
		lineCount: lines.length,
		lineAt: (line: number) => ({ range: { end: { character: lines[line].length } } }),
	} as unknown as vscode.TextDocument;
}

beforeEach(() => {
	(vscode.workspace as any).textDocuments = [];
	(vscode.workspace as any).onDidOpenTextDocument = vi.fn(() => ({ dispose() {} }));
	(vscode.workspace as any).onDidChangeTextDocument = vi.fn(() => ({ dispose() {} }));
	(vscode.workspace as any).onDidCloseTextDocument = vi.fn(() => ({ dispose() {} }));
});

describe('TriplateDiagnosticProvider', () => {
	it('publishes a diagnostic at the error location when compile fails', async () => {
		const { compile, TriplateError } = await import('triplate');
		(compile as ReturnType<typeof vi.fn>).mockImplementation(() => {
			throw new (TriplateError as any)("expected '{' after params", 2, 1);
		});

		(vscode.workspace as any).textDocuments = [makeDoc('---\nparams:\n  type: iri\n---\nSELECT 1')];

		const provider = new TriplateDiagnosticProvider();
		const collection = (provider as any)._collection as vscode.DiagnosticCollection;
		const diagnostics = collection.get(vscode.Uri.parse('file:///test.sparql'))!;

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toContain("expected '{' after params");
		expect(diagnostics[0].range.start.line).toBe(1);
		expect(diagnostics[0].range.start.character).toBe(0);
	});

	it('clears diagnostics when the template compiles', async () => {
		const { compile } = await import('triplate');
		(compile as ReturnType<typeof vi.fn>).mockReturnValue({ schema: { params: [] }, examples: [] });

		(vscode.workspace as any).textDocuments = [makeDoc('---\nparams { type: iri }\n---\nSELECT 1')];

		const provider = new TriplateDiagnosticProvider();
		const collection = (provider as any)._collection as vscode.DiagnosticCollection;

		expect(collection.get(vscode.Uri.parse('file:///test.sparql'))).toBeUndefined();
	});

	it('ignores non-template documents', async () => {
		const { compile } = await import('triplate');
		const compileSpy = compile as ReturnType<typeof vi.fn>;
		compileSpy.mockClear();

		(vscode.workspace as any).textDocuments = [makeDoc('SELECT * WHERE { ?s ?p ?o }')];

		new TriplateDiagnosticProvider();

		expect(compileSpy).not.toHaveBeenCalled();
	});

	it('ignores documents in unrelated languages', async () => {
		const { compile } = await import('triplate');
		const compileSpy = compile as ReturnType<typeof vi.fn>;
		compileSpy.mockClear();

		(vscode.workspace as any).textDocuments = [makeDoc('---\nparams { type: iri }\n---\n', 'json')];

		new TriplateDiagnosticProvider();

		expect(compileSpy).not.toHaveBeenCalled();
	});
});
