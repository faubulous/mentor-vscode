import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mockVscode from '@src/utilities/mocks/vscode';
vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	QuadContextSerializer: class {
		constructor(public serializer: any) {}
		serialize(_quads: any, _opts: any) { return 'result turtle'; }
	},
	TurtleSerializer: class {
		serialize(_quads: any, _opts: any) { return 'result turtle'; }
	},
	TurtleFormatter: class {
		format(_text: string, _opts?: any) { return _text; }
	},
}));

vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	TurtleLexer: class { tokenize(_text: string) { return { tokens: [] }; } },
	TurtleParser: class { parse(_tokens: any) { return {}; } },
	TurtleReader: class { readQuadContexts(_cst: any, _tokens: any) { return []; } },
	RdfToken: {
		A:                             { name: 'A' },
		AS_KW:                         { name: 'AS_KW' },
		BASE:                          { name: 'BASE' },
		DCARET:                        { name: 'DCARET' },
		IRIREF:                        { name: 'IRIREF' },
		LBRACKET:                      { name: 'LBRACKET' },
		PERIOD:                        { name: 'PERIOD' },
		PNAME_LN:                      { name: 'PNAME_LN' },
		PNAME_NS:                      { name: 'PNAME_NS' },
		PREFIX:                        { name: 'PREFIX' },
		SEMICOLON:                     { name: 'SEMICOLON' },
		SELECT:                        { name: 'SELECT' },
		STRING_LITERAL_LONG_QUOTE:     { name: 'STRING_LITERAL_LONG_QUOTE' },
		STRING_LITERAL_LONG_SINGLE_QUOTE: { name: 'STRING_LITERAL_LONG_SINGLE_QUOTE' },
		STRING_LITERAL_QUOTE:          { name: 'STRING_LITERAL_QUOTE' },
		STRING_LITERAL_SINGLE_QUOTE:   { name: 'STRING_LITERAL_SINGLE_QUOTE' },
		TTL_BASE:                      { name: 'TTL_BASE' },
		TTL_PREFIX:                    { name: 'TTL_PREFIX' },
		VAR1:                          { name: 'VAR1' },
	},
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

import { inlineBlankNodes } from '@src/commands/inline-blank-nodes';
import { TurtleDocument } from '@src/languages';

describe('inlineBlankNodes command', () => {
	it('should have the correct id', () => {
		expect(inlineBlankNodes.id).toBe('mentor.command.inlineBlankNodes');
	});

	it('should show error when no URI and no active editor', async () => {
		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		(mockVscode.window as any).activeTextEditor = undefined;
		await inlineBlankNodes.handler(undefined);
		expect(showErrorSpy).toHaveBeenCalledWith('Invalid document URI.');
	});

	it('should show error when document has syntax errors', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = { uri, getText: () => 'invalid turtle', languageId: 'turtle' };
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		const context = new TurtleDocument(uri, 'Turtle' as any);
		mockDocumentContextService.contexts = { [uri.toString()]: context };
		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([
			{ severity: 0 } as any, // Error severity = 0
		]);
		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		await inlineBlankNodes.handler(uri);
		expect(showErrorSpy).toHaveBeenCalledWith('This document has syntax errors and cannot be refactored.');
	});

	it('should show error when document context is not available', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = { uri, getText: () => 'valid turtle' };
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([]);
		mockDocumentContextService.contexts = {};
		const showErrorSpy = vi.spyOn(mockVscode.window, 'showErrorMessage');
		await inlineBlankNodes.handler(uri);
		expect(showErrorSpy).toHaveBeenCalledWith('The document context could not be retrieved.');
	});

	it('should apply edit when all conditions are met', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = {
			uri,
			getText: () => '@prefix ex: <urn:ex#> .\n_:b0 ex:p ex:o .\nex:s ex:p _:b0 .',
			positionAt: (offset: number) => new (mockVscode as any).Position(0, offset),
		};
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		vi.spyOn(mockVscode.languages, 'getDiagnostics').mockReturnValue([]);
		const context = new TurtleDocument(uri, 'Turtle' as any);
		mockDocumentContextService.contexts = { [uri.toString()]: context };
		const applyEditSpy = vi.spyOn(mockVscode.workspace, 'applyEdit');
		await inlineBlankNodes.handler(uri);
		expect(applyEditSpy).toHaveBeenCalled();
	});
});
