import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mockVscode from '@src/utilities/mocks/vscode';
vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	AlphabeticalSortingStrategy: class {},
	PrioritySortingStrategy: class { constructor(public options: any) {} },
	SemanticSortingStrategy: class {},
	QuadContextSerializer: class {
		constructor(public serializer: any) {}
		serialize(_quads: any, _opts: any) { return { output: 'result turtle' }; }
	},
	TurtleSerializer: class {},
}));

vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	TurtleLexer: class { tokenize(_text: string) { return { tokens: [] }; } },
	TurtleParser: class { parse(_tokens: any) { return {}; } },
	TurtleReader: class { readQuadContexts(_cst: any, _tokens: any) { return []; } },
}));

let mockDocumentContextService: any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => mockDocumentContextService),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

beforeEach(() => {
	(mockVscode.workspace as any).textDocuments = [];
	(mockVscode.window as any).activeTextEditor = undefined;
	mockDocumentContextService = {
		contexts: {},
	};
});

afterEach(() => {
	(mockVscode.workspace as any).textDocuments = [];
	(mockVscode.window as any).activeTextEditor = undefined;
});

import { sortDocument } from '@src/commands/sort-document';

describe('sortDocument', () => {
	it('should show error when no URI and no active editor', async () => {
		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		(mockVscode.window as any).activeTextEditor = undefined;
		await sortDocument(undefined, {} as any);
		expect(showErrorSpy).toHaveBeenCalledWith('No document selected.');
	});

	it('should show error when document has syntax errors', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = { uri, getText: () => 'invalid turtle', languageId: 'turtle' };
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([
			{ severity: 0 } as any, // Error severity = 0
		]);
		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		await sortDocument(uri, {} as any);
		expect(showErrorSpy).toHaveBeenCalledWith('This document has syntax errors and cannot be sorted.');
	});

	it('should ignore SHACL error diagnostics and continue sorting', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = {
			uri,
			getText: () => '@prefix ex: <urn:ex#> .\nex:A a ex:B .',
			positionAt: (offset: number) => new (mockVscode as any).Position(0, offset),
		};
		(mockVscode.workspace as any).textDocuments = [fakeDoc];

		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([
			{ severity: 0, source: 'SHACL' } as any,
		]);

		const docKey = uri.toString();
		mockDocumentContextService.contexts = {
			[docKey]: { namespaces: {}, baseIri: undefined },
		};

		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		const applyEditSpy = vi.spyOn(mockVscode.workspace, 'applyEdit');
		showErrorSpy.mockClear();
		applyEditSpy.mockClear();

		await sortDocument(uri, {} as any);

		expect(showErrorSpy.mock.calls.some((call) => call[0] === 'This document has syntax errors and cannot be sorted.')).toBe(false);
		expect(applyEditSpy).toHaveBeenCalled();
	});

	it('should show error when document context is not available', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = { uri, getText: () => 'valid turtle' };
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([]);
		mockDocumentContextService.contexts = {};
		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		await sortDocument(uri, {} as any);
		expect(showErrorSpy).toHaveBeenCalledWith('The document context could not be retrieved.');
	});

	it('should apply result edit when all conditions are met', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = {
			uri,
			getText: () => '@prefix ex: <urn:ex#> .\nex:A a ex:B .',
			positionAt: (offset: number) => new (mockVscode as any).Position(0, offset),
		};
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([]);
		const docKey = uri.toString();
		mockDocumentContextService.contexts = {
			[docKey]: { namespaces: {}, baseIri: undefined },
		};
		const applyEditSpy = vi.spyOn(mockVscode.workspace, 'applyEdit');
		const strategy = { sort: vi.fn((q: any) => q) };
		await sortDocument(uri, strategy as any);
		expect(applyEditSpy).toHaveBeenCalled();
	});
});
