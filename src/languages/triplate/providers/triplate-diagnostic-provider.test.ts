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
import { createMockTextDocument } from '@src/utilities/mocks/factories';

function makeDoc(text: string, languageId = 'sparql') {
	return createMockTextDocument(text, { uri: 'file:///test.sparql', languageId });
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

describe('TriplateDiagnosticProvider change handling', () => {
	/**
	 * Creates the provider and returns the listener it registered for document changes.
	 */
	function captureChangeListener() {
		let listener: ((e: { document: vscode.TextDocument }) => void) | undefined;

		(vscode.workspace as any).onDidChangeTextDocument = vi.fn((handler: any) => {
			listener = handler;
			return { dispose() {} };
		});

		const provider = new TriplateDiagnosticProvider();

		return { provider, listener: listener! };
	}

	it('does not schedule a validation for documents in other languages', () => {
		const { provider, listener } = captureChangeListener();
		const schedule = vi.spyOn((provider as any)._changeDebouncer, 'schedule');
		const document = makeDoc('---\nSELECT 1', 'Log');
		const getText = vi.spyOn(document, 'getText');

		listener({ document });

		expect(schedule).not.toHaveBeenCalled();
		expect(getText).not.toHaveBeenCalled();
	});

	it('schedules a validation for documents in template languages', () => {
		const { provider, listener } = captureChangeListener();
		const schedule = vi.spyOn((provider as any)._changeDebouncer, 'schedule');

		listener({ document: makeDoc('---\nSELECT 1', 'sparql') });

		expect(schedule).toHaveBeenCalledTimes(1);
	});
});
