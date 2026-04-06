import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('@src/utilities', () => ({
	getTokenPosition: vi.fn(() => ({ start: { line: 10, character: 5 }, end: { line: 10, character: 42 } })),
}));

vi.mock('@src/utilities/vscode/edit', () => ({
	calculateLineOffset: vi.fn(() => 0),
}));

const mockApplyEdit = vi.fn(async () => true);
const mockExecuteCommand = vi.fn(async () => undefined);

const mockWorkspaceEdit = {
	size: 1,
};

const mockPrefixService = {
	implementPrefixForIri: vi.fn(async () => mockWorkspaceEdit),
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'TurtlePrefixDefinitionService') return mockPrefixService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { implementPrefixForIri } from './implement-prefix-for-iri';

const makeToken = () => ({
	type: 'IRI_REF',
	value: 'http://example.org/ns#foo',
	startLine: 10,
	endLine: 10,
	startColumn: 5,
	endColumn: 42,
	image: '<http://example.org/ns#foo>',
} as any);

describe('implementPrefixForIri', () => {
	let mockEditor: any;
	let testDocument: any;

	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.workspace as any).applyEdit = mockApplyEdit;
		(vscode.commands as any).executeCommand = mockExecuteCommand;

		testDocument = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			getText: () => '',
		};

		mockEditor = {
			document: testDocument,
			selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
		};

		(vscode.workspace as any).textDocuments = [testDocument];
		(vscode.window as any).activeTextEditor = mockEditor;
	});

	it('has the correct id', () => {
		expect(implementPrefixForIri.id).toBe('mentor.command.implementPrefixForIri');
	});

	it('does nothing when document is not found', async () => {
		(vscode.workspace as any).textDocuments = [];
		const uri = vscode.Uri.parse('file:///unknown.ttl');
		await implementPrefixForIri.handler(uri, 'http://example.org/', makeToken());
		expect(mockPrefixService.implementPrefixForIri).not.toHaveBeenCalled();
	});

	it('applies edit and renames prefix when document is found and edit is non-empty', async () => {
		mockWorkspaceEdit.size = 1;
		const uri = vscode.Uri.parse('file:///test.ttl');
		await implementPrefixForIri.handler(uri, 'http://example.org/', makeToken());
		expect(mockPrefixService.implementPrefixForIri).toHaveBeenCalledWith(testDocument, 'http://example.org/');
		expect(mockApplyEdit).toHaveBeenCalledWith(mockWorkspaceEdit);
		expect(mockExecuteCommand).toHaveBeenCalledWith('editor.action.rename');
	});

	it('does not apply edit when edit is empty', async () => {
		mockWorkspaceEdit.size = 0;
		const uri = vscode.Uri.parse('file:///test.ttl');
		await implementPrefixForIri.handler(uri, 'http://example.org/', makeToken());
		expect(mockApplyEdit).not.toHaveBeenCalled();
	});

	it('does not rename when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;
		mockWorkspaceEdit.size = 1;
		const uri = vscode.Uri.parse('file:///test.ttl');
		await implementPrefixForIri.handler(uri, 'http://example.org/', makeToken());
		expect(mockApplyEdit).not.toHaveBeenCalled();
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it('does not rename when applyEdit returns false', async () => {
		mockApplyEdit.mockResolvedValue(false);
		mockWorkspaceEdit.size = 1;
		const uri = vscode.Uri.parse('file:///test.ttl');
		await implementPrefixForIri.handler(uri, 'http://example.org/', makeToken());
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});
