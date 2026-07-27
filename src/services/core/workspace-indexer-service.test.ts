import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

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
let mockTokenSource: any;
let mockDiagnosticsService: any;

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
		// The notebook path uses loadDocument; the text path uses the content-based
		// loadDocumentContent. Both delegate to the same spy so existing call-count
		// assertions cover either path.
		loadDocument: (...args: any[]) => mockLoadDocument(...args),
		loadDocumentContent: (...args: any[]) => mockLoadDocument(...args),
	};

	mockWorkspaceFileService = {
		files: [] as vscode.Uri[],
	};

	mockTokenSource = {
		refreshTokens: vi.fn(() => true),
	};

	mockDiagnosticsService = {
		diagnoseContent: vi.fn(),
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
	(vscode.workspace as any).textDocuments = [];
	(vscode.workspace as any).fs = {
		stat: vi.fn(async () => ({ size: 100 })),
		readFile: vi.fn(async () => new TextEncoder().encode('')),
	};
});

describe('WorkspaceIndexerService', () => {
	describe('constructor', () => {
		it('should initialize with indexed=false', () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			expect(service.indexingFinished).toBe(false);
		});

		it('should set context to not indexing on construction', () => {
			new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'mentor.workspace.isIndexing', false);
		});

		it('should emit onDidFinishIndexing event', () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			expect(service.onDidFinishIndexing).toBeDefined();
		});

		it('shows the Mentor icon in the status bar immediately so it is visible with 0 files', () => {
			const statusBarItem = { text: '', tooltip: '', command: undefined, show: vi.fn(), hide: vi.fn(), dispose: vi.fn() };
			(vscode.window as any).createStatusBarItem = vi.fn(() => statusBarItem);

			new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);

			expect(statusBarItem.text).toContain('$(list-tree)');
			expect(statusBarItem.show).toHaveBeenCalled();
		});
	});

	describe('indexWorkspace', () => {
		it('should mark workspace as indexed after completion', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(service.indexingFinished).toBe(true);
		});

		it('coalesces concurrent calls into a single trailing pass instead of overlapping runs', async () => {
			mockWorkspaceFileService.files = [vscode.Uri.parse('file:///w/a.ttl')];

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);

			// Four concurrent requests must not run four overlapping passes: the
			// first runs immediately and the rest collapse into one trailing pass.
			await Promise.all([
				service.indexWorkspace(),
				service.indexWorkspace(),
				service.indexWorkspace(),
				service.indexWorkspace(),
			]);

			expect(mockLoadDocument).toHaveBeenCalledTimes(2);
		});

		it('keeps the Mentor icon in the status bar after indexing an empty workspace', async () => {
			mockWorkspaceFileService.files = [];

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();

			expect((service as any)._statusBarItem.text).toContain('$(list-tree)');
		});

		it('requests fresh parser output from the token source during reindex', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
				uri,
				languageId: 'turtle',
				getText: vi.fn(() => ''),
			}));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace(true);
			await service.waitForIndexed();

			expect(mockTokenSource.refreshTokens).toHaveBeenCalledWith(uri.toString());
		});

		it('should index all workspace files', async () => {
			const uri1 = vscode.Uri.parse('file:///w/test1.ttl');
			const uri2 = vscode.Uri.parse('file:///w/test2.ttl');
			mockWorkspaceFileService.files = [uri1, uri2];
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(mockLoadDocument).toHaveBeenCalledTimes(2);
		});

		it('computes syntax diagnostics for each text file when index.diagnoseFiles is enabled', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			// No override => default true.
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(mockDiagnosticsService.diagnoseContent).toHaveBeenCalledWith(uri, expect.any(String));
		});

		it('does not compute diagnostics when index.diagnoseFiles is disabled', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockConfigValues['index.diagnoseFiles'] = false;
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();
			expect(mockDiagnosticsService.diagnoseContent).not.toHaveBeenCalled();
		});

		it('should skip already indexed files when force=false', async () => {
			const uri = vscode.Uri.parse('file:///test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockContexts[uri.toString()] = { loaded: true }; // already indexed
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace(false);
			expect(mockLoadDocument).not.toHaveBeenCalled();
		});

		it('should re-index already indexed files when force=true', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];
			mockContexts[uri.toString()] = { loaded: true }; // already indexed
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();
			// Turtle (triple-source) and SPARQL (supported non-triple-source) are indexed; markdown is skipped
			expect(mockLoadDocument).toHaveBeenCalledTimes(2);
			expect(mockLoadDocument).toHaveBeenCalledWith(turtleCell.document, false, undefined);
			expect(mockLoadDocument).toHaveBeenCalledWith(sparqlCell.document, false, undefined);
			expect(mockLoadDocument).not.toHaveBeenCalledWith(markdownCell.document, false, undefined);
		});

		it('should fire onDidFinishIndexing after indexing', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace(false);
			await service.waitForIndexed();

			expect(mockLoadDocument).toHaveBeenCalledTimes(1);
		});
	});

	describe('waitForIndexed', () => {
		it('should resolve immediately if already indexed', async () => {
			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
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

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			await service.indexWorkspace();
			await service.waitForIndexed();

			expect((service as any)._statusBarItem.text).toMatch(/1 error/);
		});

		it('shows indexing progress on the status bar item while pending and the summary after completion', async () => {
			const uri = vscode.Uri.parse('file:///w/test.ttl');
			mockWorkspaceFileService.files = [uri];

			let resolveLoad!: () => void;
			mockLoadDocument = vi.fn(() => new Promise<void>(resolve => { resolveLoad = resolve; }));

			const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);
			const indexPromise = service.indexWorkspace();
			for (let i = 0; i < 10 && !resolveLoad; i++) {
				await Promise.resolve();
			}
			expect(resolveLoad).toBeTypeOf('function');

			// While indexing, the live progress is shown on the indexer's own item.
			const textWhilePending = (service as any)._statusBarItem.text;
			expect(textWhilePending).toContain('Indexing');

			// Unblock background task and wait for settlement
			resolveLoad();
			await indexPromise;
			const textAfterSettlement = (service as any)._statusBarItem.text;

			// The same item then shows the completion summary.
			expect(textAfterSettlement).toMatch(/files/);
		});
	});
});

describe('WorkspaceIndexerService progress rendering and yielding', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('throttles progress rendering to about ten writes per second', () => {
		const texts: string[] = [];
		let value = '';

		(vscode.window as any).createStatusBarItem = vi.fn(() => ({
			get text() { return value; },
			set text(newValue: string) { value = newValue; texts.push(newValue); },
			tooltip: '',
			command: undefined,
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn(),
		}));

		const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);

		let now = 100_000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);

		// 100 per-file updates spaced 10 ms apart — a fast pass over small files.
		for (let completed = 1; completed <= 100; completed++) {
			now += 10;
			(service as any)._reportProgress(completed, 100);
		}

		const progressTexts = texts.filter(text => text.includes('Indexing:'));

		// Each status bar write is an IPC message; ~1 second of updates must
		// collapse to roughly ten renders — and the final count always renders.
		expect(progressTexts.length).toBeLessThanOrEqual(13);
		expect(progressTexts[progressTexts.length - 1]).toContain('100 of 100');
	});

	it('yields to the event loop between indexed files', async () => {
		mockWorkspaceFileService.files = [
			vscode.Uri.parse('file:///w/a.ttl'),
			vscode.Uri.parse('file:///w/b.ttl'),
			vscode.Uri.parse('file:///w/c.ttl'),
		];

		const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);

		// Force the wall clock past the ~50 ms budget between files so the loop
		// takes its yield branch deterministically (parsing is instantaneous here).
		let now = 100_000;
		const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => (now += 100));
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		try {
			await service.indexWorkspace();

			// A zero-delay macrotask was scheduled at least once during the pass —
			// the mechanism that lets the renderer paint while indexing runs.
			expect(timeoutSpy.mock.calls.some(call => call[1] === 0)).toBe(true);
		} finally {
			dateSpy.mockRestore();
			timeoutSpy.mockRestore();
		}
	});
});

describe('WorkspaceIndexerService error reporting', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Captures what the indexer writes to its output channel, so the log content
	 * itself can be asserted.
	 */
	function captureLog() {
		const errors: string[] = [];
		const infos: string[] = [];

		(vscode.window as any).createOutputChannel = vi.fn(() => ({
			appendLine: vi.fn(),
			append: vi.fn(),
			trace: vi.fn(),
			debug: vi.fn(),
			info: vi.fn((message: string) => infos.push(message)),
			warn: vi.fn(),
			error: vi.fn((message: string) => errors.push(message)),
			clear: vi.fn(),
			dispose: vi.fn(),
			show: vi.fn(),
			hide: vi.fn(),
		}));

		return { errors, infos };
	}

	it('logs the file and reason when indexing a file fails', async () => {
		const { errors } = captureLog();

		mockWorkspaceFileService.files = [vscode.Uri.parse('file:///w/broken.ttl')];
		mockLoadDocument.mockRejectedValueOnce(new RangeError('Maximum call stack size exceeded'));

		const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);

		await service.indexWorkspace();
		await service.waitForIndexed();

		// A counted error must never be invisible: the summary reports "1 error",
		// so the log has to name the file and the reason.
		const failure = errors.find(message => message.includes('broken.ttl'));

		expect(failure).toBeDefined();
		expect(failure).toContain('Maximum call stack size exceeded');
		expect((service as any)._statusBarItem.text).toMatch(/1 error/);
	});

	it('ignores blank include patterns without reporting a configuration error', async () => {
		const { errors } = captureLog();

		// Clearing a row in the settings list persists an empty string; it cannot
		// change what is indexed, so it must not be surfaced as an error.
		mockConfigValues['index.includeFiles'] = ['', '  ', 'data/**'];

		const showWarningMessage = vi.fn(async () => undefined);
		(vscode.window as any).showWarningMessage = showWarningMessage;

		const service = new WorkspaceIndexerService(mockDocumentFactory, mockContextService, mockWorkspaceFileService, mockTokenSource, mockDiagnosticsService);

		await service.indexWorkspace();
		await service.waitForIndexed();

		expect(errors.filter(message => message.includes('includeFiles'))).toEqual([]);
		expect(showWarningMessage).not.toHaveBeenCalled();
	});

});
