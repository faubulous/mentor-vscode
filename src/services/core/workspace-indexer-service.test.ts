import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

import * as vscode from 'vscode';
import { WorkspaceIndexerService } from './workspace-indexer-service';

let mockIsSupportedNotebookFile: Mock;
let mockIsTripleSourceLanguage: Mock;
let mockLoadDocument: Mock;
let mockContexts: Record<string, any>;

let mockDocumentFactory: any;
let mockContextService: any;
let mockWorkspaceFileService: any;

beforeEach(() => {
	mockIsSupportedNotebookFile = vi.fn(() => false);
	mockIsTripleSourceLanguage = vi.fn(() => true);
	mockLoadDocument = vi.fn(async () => {});
	mockContexts = {};

	mockDocumentFactory = {
		isSupportedNotebookFile: (...args: any[]) => mockIsSupportedNotebookFile(...args),
		isTripleSourceLanguage: (...args: any[]) => mockIsTripleSourceLanguage(...args),
	};

	mockContextService = {
		contexts: mockContexts,
		loadDocument: (...args: any[]) => mockLoadDocument(...args),
	};

	mockWorkspaceFileService = {
		files: [] as vscode.Uri[],
	};

	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
	(vscode.window as any).withProgress = vi.fn(async (_opts: any, task: any) => {
		await task({ report: vi.fn() }, { isCancellationRequested: false });
	});
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({ uri: vscode.Uri.parse('file:///test.ttl') }));
	(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
		getCells: vi.fn(() => []),
	}));
	(vscode.workspace as any).fs = {
		stat: vi.fn(async () => ({ size: 100 })),
	};
});

describe('WorkspaceIndexerService', () => {
	describe('constructor', () => {
		it('should initialize with indexed=false', () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			expect(service.indexed).toBe(false);
		});

		it('should set context to not indexing on construction', () => {
			new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'mentor.workspace.isIndexing', false);
		});

		it('should emit onDidFinishIndexing event', () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			expect(service.onDidFinishIndexing).toBeDefined();
		});
	});

	describe('indexWorkspace', () => {
		it('should mark workspace as indexed after completion', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace();
			expect(service.indexed).toBe(true);
		});

		it('should index all workspace files', async () => {
			const uri1 = vscode.Uri.parse('file:///test1.ttl');
			const uri2 = vscode.Uri.parse('file:///test2.ttl');
			mockWorkspaceFileService.files = [uri1, uri2];
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace();
			expect(mockLoadDocument).toHaveBeenCalledTimes(2);
		});

		it('should skip already indexed files when force=false', async () => {
			const uri = vscode.Uri.parse('file:///test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockContexts[uri.toString()] = { loaded: true }; // already indexed
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace(false);
			expect(mockLoadDocument).not.toHaveBeenCalled();
		});

		it('should re-index already indexed files when force=true', async () => {
			const uri = vscode.Uri.parse('file:///test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockContexts[uri.toString()] = { loaded: true }; // already indexed
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace(true);
			expect(mockLoadDocument).toHaveBeenCalledTimes(1);
		});

		it('should skip files larger than maxFileSize when force=false', async () => {
			const uri = vscode.Uri.parse('file:///large.ttl');
			mockWorkspaceFileService.files = [uri];
			(vscode.workspace as any).fs.stat = vi.fn(async () => ({ size: Number.MAX_SAFE_INTEGER + 1 }));
			// getConfig().get returns MAX_SAFE_INTEGER as default, so any size > that is skipped
			// Actually with default MAX_SAFE_INTEGER and size = MAX_SAFE_INT+1, it should skip
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace(false);
			// Large file should be skipped since size > maxSize
			expect(mockLoadDocument).not.toHaveBeenCalled();
		});

		it('should index notebook files via openNotebookDocument', async () => {
			const notebookUri = vscode.Uri.parse('file:///test.mentor-notebook');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			const mockCell = {
				document: { uri: vscode.Uri.parse('cell:///0'), languageId: 'sparql' },
			};
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [mockCell]),
			}));
			(vscode.workspace as any).fs.stat = vi.fn(async () => ({ size: 100 }));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace();
			expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith(notebookUri);
			expect(mockLoadDocument).toHaveBeenCalledWith(mockCell.document);
		});

		it('should fire onDidFinishIndexing after indexing', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			let fired = false;
			service.onDidFinishIndexing(() => { fired = true; });
			await service.indexWorkspace();
			expect(fired).toBe(true);
		});
	});

	describe('waitForIndexed', () => {
		it('should resolve immediately if already indexed', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService);
			await service.indexWorkspace();
			// Now indexed=true, so waitForIndexed should resolve immediately
			await expect(service.waitForIndexed()).resolves.toBeUndefined();
		});
	});
});
