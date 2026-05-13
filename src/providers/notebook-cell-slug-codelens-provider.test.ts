import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const mockContextService = {
	contexts: {} as Record<string, any>,
	onDidChangeDocumentContext: vi.fn(() => ({ dispose: vi.fn() })),
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			return {};
		}),
	},
	injectable: () => (_target: any) => _target,
	inject: () => () => {},
	singleton: () => (_target: any) => _target,
}));

import * as vscode from 'vscode';
import { NotebookCellSlugCodeLensProvider } from '@src/providers/notebook-cell-slug-codelens-provider';

function makeDocument(scheme: string, uriStr: string): vscode.TextDocument {
	return { uri: { scheme, toString: () => uriStr } } as any;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockContextService.contexts = {};
	mockContextService.onDidChangeDocumentContext.mockReturnValue({ dispose: vi.fn() });
	(vscode.workspace as any).notebookDocuments = [];
	(vscode.workspace as any).onDidOpenNotebookDocument = vi.fn(() => ({ dispose: vi.fn() }));
});

describe('NotebookCellSlugCodeLensProvider', () => {
	it('can be instantiated without throwing', () => {
		expect(() => new NotebookCellSlugCodeLensProvider()).not.toThrow();
	});

	it('_initialized is false before first provideCodeLenses call', () => {
		const provider = new NotebookCellSlugCodeLensProvider();
		expect((provider as any)._initialized).toBe(false);
	});

	it('returns empty array for non-notebook-cell URI scheme', () => {
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('file', 'file:///doc.ttl'));
		expect(lenses).toEqual([]);
	});

	it('returns empty array when no slug in context or metadata', () => {
		const uriStr = 'vscode-notebook-cell:///test#W0';
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));
		expect(lenses).toEqual([]);
	});

	it('returns codelens when slug is in document context', () => {
		const uriStr = 'vscode-notebook-cell:///test#W0';
		mockContextService.contexts[uriStr] = { slug: 'my-cell' };
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));
		expect(lenses).toHaveLength(1);
	});

	it('returns codelens when slug is in notebook cell metadata', () => {
		const uriStr = 'vscode-notebook-cell:///test#W0';
		const mockCell = { document: { uri: { toString: () => uriStr } }, metadata: { slug: 'meta-slug' } };
		const mockNotebook = { getCells: () => [mockCell] };
		(vscode.workspace as any).notebookDocuments = [mockNotebook];
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));
		expect(lenses).toHaveLength(1);
	});

	it('codelens title is #slug', () => {
		const uriStr = 'vscode-notebook-cell:///test#W0';
		mockContextService.contexts[uriStr] = { slug: 'my-cell' };
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));
		expect(lenses[0].command?.title).toBe('#my-cell');
	});

	it('codelens command is mentor.command.triggerNotebookCellSlugAction', () => {
		const uriStr = 'vscode-notebook-cell:///test#W0';
		mockContextService.contexts[uriStr] = { slug: 'my-cell' };
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));
		expect(lenses[0].command?.command).toBe('mentor.command.triggerNotebookCellSlugAction');
	});

	it('codelens tooltip reflects new action', () => {
		const uriStr = 'vscode-notebook-cell:///test#W0';
		mockContextService.contexts[uriStr] = { slug: 'my-cell' };
		const provider = new NotebookCellSlugCodeLensProvider();
		const lenses = provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));
		expect(lenses[0].command?.tooltip).toBe('Click to edit slug or copy cell URI');
	});

	it('refresh() fires onDidChangeCodeLenses', () => {
		const provider = new NotebookCellSlugCodeLensProvider();
		const fired: number[] = [];
		provider.onDidChangeCodeLenses(() => fired.push(1));
		provider.refresh();
		expect(fired).toHaveLength(1);
	});

	it('fires onDidChangeCodeLenses when context changes', () => {
		let capturedHandler: (() => void) | undefined;
		mockContextService.onDidChangeDocumentContext.mockImplementation((handler: any) => {
			capturedHandler = handler;
			return { dispose: vi.fn() };
		});

		const uriStr = 'vscode-notebook-cell:///test#W0';
		mockContextService.contexts[uriStr] = { slug: 'my-cell' };
		const provider = new NotebookCellSlugCodeLensProvider();
		provider.provideCodeLenses(makeDocument('vscode-notebook-cell', uriStr));

		const fired: number[] = [];
		provider.onDidChangeCodeLenses(() => fired.push(1));

		expect(capturedHandler).toBeDefined();
		capturedHandler!();
		expect(fired).toHaveLength(1);
	});
});
