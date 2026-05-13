import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (k: string, d?: any) => mockConfigValues[k] ?? d }),
}));

import * as vscode from 'vscode';
import { WorkspaceIndexerService } from '@src/services/core/workspace-indexer-service';

let mockIsSupportedNotebookFile: Mock;
let mockIsTripleSourceLanguage: Mock;
let mockLoadDocument: Mock;
let mockContexts: Record<string, any>;

let mockDocumentFactory: any;
let mockContextService: any;
let mockWorkspaceFileService: any;
let mockConfigValues: Record<string, any>;
let mockLanguageClientRegistry: any;

beforeEach(() => {
	mockIsSupportedNotebookFile = vi.fn(() => false);
	mockIsTripleSourceLanguage = vi.fn(() => true);
	mockLoadDocument = vi.fn(async () => {});
	mockContexts = {};

	mockDocumentFactory = {
		isSupportedNotebookFile: (...args: any[]) => mockIsSupportedNotebookFile(...args),
		isTripleSourceLanguage: (...args: any[]) => mockIsTripleSourceLanguage(...args),
		supportedLanguages: new Set(['turtle', 'n3', 'ntriples', 'nquads', 'trig', 'sparql', 'xml']),
	};

	mockContextService = {
		contexts: mockContexts,
		clear: vi.fn(() => {
			for (const key of Object.keys(mockContexts)) {
				delete mockContexts[key];
			}
		}),
		loadDocument: (...args: any[]) => mockLoadDocument(...args),
	};

	mockWorkspaceFileService = {
		files: [] as vscode.Uri[],
	};

	mockLanguageClientRegistry = {
		requestContextRefresh: vi.fn(async () => false),
	};

	mockConfigValues = {};

	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
	(vscode.window as any).withProgress = vi.fn(async (_opts: any, task: any) => {
		await task({ report: vi.fn() }, { isCancellationRequested: false });
	});
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('file:///test.ttl'),
		languageId: 'turtle',
		getText: vi.fn(() => ''),
	}));
	(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
		getCells: vi.fn(() => []),
	}));
	(vscode.workspace as any).fs = {
		stat: vi.fn(async () => ({ size: 100 })),
	};

	mockLanguageClientRegistry.requestContextRefresh.mockReset();
	mockLanguageClientRegistry.requestContextRefresh.mockResolvedValue(false);
});

describe('WorkspaceIndexerService', () => {
	describe('constructor', () => {
		it('should initialize with indexed=false', () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			expect(service.indexingFinished).toBe(false);
		});

		it('should set context to not indexing on construction', () => {
			new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'mentor.workspace.isIndexing', false);
		});

		it('should emit onDidFinishIndexing event', () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			expect(service.onDidFinishIndexing).toBeDefined();
		});
	});

	describe('indexWorkspace', () => {
		it('should mark workspace as indexed after completion', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(service.indexingFinished).toBe(true);
		});

		it('should request a context refresh during reindex', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
				uri,
				languageId: 'turtle',
				getText: vi.fn(() => ''),
			}));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace(true);
			await service.waitForIndexed();

			expect(mockLanguageClientRegistry.requestContextRefresh).toHaveBeenCalledWith('turtle', uri.toString());
		});

		it('should index all workspace files', async () => {
			const uri1 = vscode.Uri.parse('file:///w/test1.ttl');
			const uri2 = vscode.Uri.parse('file:///w/test2.ttl');
			mockWorkspaceFileService.files = [uri1, uri2];
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(mockLoadDocument).toHaveBeenCalledTimes(2);
		});

		it('should skip already indexed files when force=false', async () => {
			const uri = vscode.Uri.parse('file:///test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockContexts[uri.toString()] = { loaded: true }; // already indexed
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace(false);
			expect(mockLoadDocument).not.toHaveBeenCalled();
		});

		it('should re-index already indexed files when force=true', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockContexts[uri.toString()] = { loaded: true }; // already indexed
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace(true);
			await service.waitForIndexed();
			expect(mockLoadDocument).toHaveBeenCalledTimes(1);
		});

		it('should skip files larger than maxFileSize when force=false', async () => {
			const uri = vscode.Uri.parse('file:///large.ttl');
			mockWorkspaceFileService.files = [uri];
			(vscode.workspace as any).fs.stat = vi.fn(async () => ({ size: Number.MAX_SAFE_INTEGER + 1 }));
			// getConfig().get returns MAX_SAFE_INTEGER as default, so any size > that is skipped
			// Actually with default MAX_SAFE_INTEGER and size = MAX_SAFE_INT+1, it should skip
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace(false);
			// Large file should be skipped since size > maxSize
			expect(mockLoadDocument).not.toHaveBeenCalled();
		});

		it('should index notebook files via openNotebookDocument', async () => {
			const notebookUri = vscode.Uri.parse('file:///w/test.mentor-notebook');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			const mockCell = {
				document: { uri: vscode.Uri.parse('cell:///0'), languageId: 'sparql' },
			};
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [mockCell]),
			}));
			(vscode.workspace as any).fs.stat = vi.fn(async () => ({ size: 100 }));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith(notebookUri);
			expect(mockLoadDocument).toHaveBeenCalledWith(mockCell.document, false, undefined);
		});

		it('should index SPARQL notebook cells even though they are not triple-source', async () => {
			const notebookUri = vscode.Uri.parse('file:///w/test.mnb');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			// SPARQL is not a triple-source language
			mockIsTripleSourceLanguage.mockReturnValue(false);
			const sparqlCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell1'), languageId: 'sparql' },
			};
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [sparqlCell]),
			}));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			// SPARQL cell must be indexed so its references map is populated for rename support
			expect(mockLoadDocument).toHaveBeenCalledWith(sparqlCell.document, false, undefined);
		});

		it('should skip unsupported-language notebook cells such as markdown', async () => {
			const notebookUri = vscode.Uri.parse('file:///test.mnb');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			mockIsTripleSourceLanguage.mockReturnValue(false);
			const markdownCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell2'), languageId: 'markdown' },
			};
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [markdownCell]),
			}));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			// Markdown is not a supported language — it must be skipped
			expect(mockLoadDocument).not.toHaveBeenCalled();
		});

		it('should index triple-source cells and SPARQL cells together in the same notebook', async () => {
			const notebookUri = vscode.Uri.parse('file:///w/test.mnb');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			const turtleCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell1'), languageId: 'turtle' },
			};
			const sparqlCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell2'), languageId: 'sparql' },
			};
			const markdownCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell3'), languageId: 'markdown' },
			};
			mockIsTripleSourceLanguage.mockImplementation((lang: string) => lang === 'turtle');
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [turtleCell, sparqlCell, markdownCell]),
			}));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			// Turtle (triple-source) and SPARQL (supported non-triple-source) are indexed; markdown is skipped
			expect(mockLoadDocument).toHaveBeenCalledTimes(2);
			expect(mockLoadDocument).toHaveBeenCalledWith(turtleCell.document, false, undefined);
			expect(mockLoadDocument).toHaveBeenCalledWith(sparqlCell.document, false, undefined);
			expect(mockLoadDocument).not.toHaveBeenCalledWith(markdownCell.document, false, undefined);
		});

		it('should fire onDidFinishIndexing after indexing', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			let fired = false;
			service.onDidFinishIndexing(() => { fired = true; });
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(fired).toBe(true);
		});

		it('should pass cell slug from metadata as the third argument to loadDocument', async () => {
			const notebookUri = vscode.Uri.parse('file:///w/test.mnb');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			const sluggedCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell1'), languageId: 'turtle' },
				metadata: { slug: 'my-data' },
			};
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [sluggedCell]),
			}));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(mockLoadDocument).toHaveBeenCalledWith(sluggedCell.document, false, 'my-data');
		});

		it('should pass undefined slug when cell metadata has no slug', async () => {
			const notebookUri = vscode.Uri.parse('file:///w/test.mnb');
			mockWorkspaceFileService.files = [notebookUri];
			mockIsSupportedNotebookFile.mockReturnValue(true);
			const noSlugCell = {
				document: { uri: vscode.Uri.parse('vscode-notebook-cell:///test.mnb#cell1'), languageId: 'turtle' },
				metadata: {},
			};
			(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
				getCells: vi.fn(() => [noSlugCell]),
			}));
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(mockLoadDocument).toHaveBeenCalledWith(noSlugCell.document, false, undefined);
		});

		it('should treat include glob with leading slash as workspace-relative', async () => {
			const uri = vscode.Uri.parse('file:///w/data/ontologies/test.ttl');
			mockWorkspaceFileService.files = [uri];
			(vscode.workspace as any).fs.stat = vi.fn(async () => ({ size: Number.MAX_SAFE_INTEGER + 1 }));
			mockConfigValues['index.maxFileSize'] = Number.MAX_SAFE_INTEGER;
			mockConfigValues['index.includeFiles'] = ['/data/ontologies/*.ttl'];

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace(false);
			await service.waitForIndexed();

			expect(mockLoadDocument).toHaveBeenCalledTimes(1);
		});

		it('should treat include glob without leading slash as workspace-relative', async () => {
			const uri = vscode.Uri.parse('file:///w/data/ontologies/test.ttl');
			mockWorkspaceFileService.files = [uri];
			(vscode.workspace as any).fs.stat = vi.fn(async () => ({ size: Number.MAX_SAFE_INTEGER + 1 }));
			mockConfigValues['index.maxFileSize'] = Number.MAX_SAFE_INTEGER;
			mockConfigValues['index.includeFiles'] = ['data/ontologies/*.ttl'];

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace(false);
			await service.waitForIndexed();

			expect(mockLoadDocument).toHaveBeenCalledTimes(1);
		});
	});

	describe('waitForIndexed', () => {
		it('should resolve immediately if already indexed', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed(); // wait for background tasks to settle
			// Now indexed=true, so a second waitForIndexed should resolve immediately
			await expect(service.waitForIndexed()).resolves.toBeUndefined();
		});
	});

	describe('background task settlement', () => {
		it('should keep indexingFinished false while background tasks are pending', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];

			let resolveLoad!: () => void;
			mockLoadDocument = vi.fn(() => new Promise<void>(resolve => { resolveLoad = resolve; }));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			const indexPromise = service.indexWorkspace();

			// Let indexing dispatch and block on the unresolved load.
			for (let i = 0; i < 10 && !resolveLoad; i++) {
				await Promise.resolve();
			}
			expect(resolveLoad).toBeTypeOf('function');
			expect(service.indexingFinished).toBe(false);

			// Unblock background task and wait for settlement.
			resolveLoad();
			await indexPromise;
			expect(service.indexingFinished).toBe(true);
		});

		it('should set indexingFinished to false until background tasks settle', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];

			let resolveLoad!: () => void;
			mockLoadDocument = vi.fn(() => new Promise<void>(resolve => { resolveLoad = resolve; }));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			const indexPromise = service.indexWorkspace();
			for (let i = 0; i < 10 && !resolveLoad; i++) {
				await Promise.resolve();
			}
			expect(resolveLoad).toBeTypeOf('function');

			expect(service.indexingFinished).toBe(false);

			resolveLoad();
			await indexPromise;

			expect(service.indexingFinished).toBe(true);
		});

		it('should fire onDidFinishIndexing only after background tasks settle', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];

			let resolveLoad!: () => void;
			mockLoadDocument = vi.fn(() => new Promise<void>(resolve => { resolveLoad = resolve; }));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			let fired = false;
			service.onDidFinishIndexing(() => { fired = true; });

			const indexPromise = service.indexWorkspace();
			for (let i = 0; i < 10 && !resolveLoad; i++) {
				await Promise.resolve();
			}
			expect(resolveLoad).toBeTypeOf('function');
			expect(fired).toBe(false);

			resolveLoad();
			await indexPromise;
			expect(fired).toBe(true);
		});

		it('should resolve waitForIndexed only after background tasks settle', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];

			let resolveLoad!: () => void;
			mockLoadDocument = vi.fn(() => new Promise<void>(resolve => { resolveLoad = resolve; }));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			const indexPromise = service.indexWorkspace();
			for (let i = 0; i < 10 && !resolveLoad; i++) {
				await Promise.resolve();
			}
			expect(resolveLoad).toBeTypeOf('function');

			let settled = false;
			const waitPromise = service.waitForIndexed().then(() => { settled = true; });

			// Not settled yet
			await Promise.resolve();
			expect(settled).toBe(false);

			resolveLoad();
			await indexPromise;
			await waitPromise;
			expect(settled).toBe(true);
		});

		it('should count errors from failed background tasks in the status bar text', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockLoadDocument = vi.fn(async () => { throw new Error('load failed'); });

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			await service.indexWorkspace();
			await service.waitForIndexed();

			expect((service as any)._statusBarItem.text).toMatch(/1 error/);
		});

		it('should only show the custom status bar summary after completion', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];

			let resolveLoad!: () => void;
			mockLoadDocument = vi.fn(() => new Promise<void>(resolve => { resolveLoad = resolve; }));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockLanguageClientRegistry);
			const indexPromise = service.indexWorkspace();
			for (let i = 0; i < 10 && !resolveLoad; i++) {
				await Promise.resolve();
			}
			expect(resolveLoad).toBeTypeOf('function');

			const textWhilePending = (service as any)._statusBarItem.text;
			expect(textWhilePending).toBe('');

			// Unblock background task and wait for settlement
			resolveLoad();
			await indexPromise;
			const textAfterSettlement = (service as any)._statusBarItem.text;

			expect(textAfterSettlement).toMatch(/Loaded/);
		});
	});
});
