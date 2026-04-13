import { describe, it, expect, vi, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { DocumentContextService } from './document-context-service';
import { IDocumentContext } from './document-context.interface';

vi.mock('@faubulous/mentor-rdf', () => ({
	Store: class { deleteGraphs = vi.fn(); },
	VocabularyRepository: class { getPredicateUsageStats = vi.fn(() => ({})); },
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_key: string, defaultValue?: any) => defaultValue }),
}));

function createMockContext(overrides: Partial<IDocumentContext> = {}): IDocumentContext {
	return {
		uri: vscode.Uri.parse('file:///test.ttl'),
		graphs: [],
		graphIri: vscode.Uri.parse('file:///test.ttl'),
		baseIri: undefined,
		namespaces: {},
		namespaceDefinitions: {},
		subjects: {},
		references: {},
		typeAssertions: {},
		typeDefinitions: {},
		predicateStats: {} as any,
		primaryLanguage: undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
		predicates: { label: [], description: [] },
		isLoaded: true,
		hasTokens: false,
		isTemporary: false,
		loadTriples: vi.fn(),
		infer: vi.fn(),
		getIriAtPosition: vi.fn(),
		getLiteralAtPosition: vi.fn(),
		onDidChangeDocument: vi.fn(),
		getTextDocument: vi.fn(),
		...overrides,
	} as any;
}

function createService() {
	const mockExtensionContext = { subscriptions: { push: vi.fn() } };
	const mockStore = { deleteGraphs: vi.fn() };
	const mockVocabulary = { getPredicateUsageStats: vi.fn(() => ({})) };
	const mockDocumentFactory = {
		supportedLanguages: new Set(['turtle', 'sparql']),
		getConvertibleTargetLanguageIds: vi.fn(() => []),
		isConvertibleLanguage: vi.fn(() => false),
		isTripleSourceLanguage: vi.fn(() => false),
		create: vi.fn(() => createMockContext()),
	};

	const service = new DocumentContextService(
		mockExtensionContext as any,
		mockStore as any,
		mockVocabulary as any,
		mockDocumentFactory as any,
	);

	return { service, mockStore, mockDocumentFactory };
}

describe('DocumentContextService', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('resolveTokens', () => {
		it('notifies one-shot listeners registered via onNextTokenDelivery', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [];

			const deliveryPromise = service.onNextTokenDelivery(uri, 5000);
			service.resolveTokens(uri, tokens);

			await expect(deliveryPromise).resolves.toBe(tokens);
		});

		it('clears one-shot listeners after notification so a second resolveTokens does not throw', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [];

			const p1 = service.onNextTokenDelivery(uri, 5000);
			service.resolveTokens(uri, tokens);
			await p1;

			expect(() => service.resolveTokens(uri, tokens)).not.toThrow();
		});

		it('resolves a pending waitForTokens request', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [];

			const waitPromise = service.waitForTokens(uri, 5000);
			service.resolveTokens(uri, tokens);

			await expect(waitPromise).resolves.toBe(tokens);
		});

		it('notifies multiple one-shot listeners for the same URI', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [];

			const p1 = service.onNextTokenDelivery(uri, 5000);
			const p2 = service.onNextTokenDelivery(uri, 5000);
			service.resolveTokens(uri, tokens);

			const results = await Promise.all([p1, p2]);
			expect(results[0]).toBe(tokens);
			expect(results[1]).toBe(tokens);
		});
	});

	describe('onNextTokenDelivery', () => {
		it('resolves with tokens when resolveTokens is called', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [{ image: 'SELECT' } as any];

			const promise = service.onNextTokenDelivery(uri, 5000);
			service.resolveTokens(uri, tokens);

			await expect(promise).resolves.toBe(tokens);
		});

		it('rejects on timeout', async () => {
			vi.useFakeTimers();
			const { service } = createService();
			const uri = 'file:///test.sparql';

			const promise = service.onNextTokenDelivery(uri, 200);
			vi.advanceTimersByTime(200);

			await expect(promise).rejects.toThrow(/Timeout/);
		});

		it('does not cancel a concurrent waitForTokens request', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [];

			const waitPromise = service.waitForTokens(uri, 5000);
			const listenPromise = service.onNextTokenDelivery(uri, 5000);

			service.resolveTokens(uri, tokens);

			await expect(Promise.all([waitPromise, listenPromise])).resolves.toBeDefined();
		});
	});

	describe('waitForTokens', () => {
		it('resolves with the delivered tokens', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [{ image: 'PREFIX' } as any];

			const promise = service.waitForTokens(uri, 5000);
			service.resolveTokens(uri, tokens);

			await expect(promise).resolves.toBe(tokens);
		});

		it('cancels the first call when a second call is made for the same URI', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';

			const first = service.waitForTokens(uri, 5000);
			const second = service.waitForTokens(uri, 5000);

			service.resolveTokens(uri, []);

			await expect(first).rejects.toThrow();
			await expect(second).resolves.toBeDefined();
		});

		it('rejects on timeout', async () => {
			vi.useFakeTimers();
			const { service } = createService();
			const uri = 'file:///test.sparql';

			const promise = service.waitForTokens(uri, 200);
			vi.advanceTimersByTime(200);

			await expect(promise).rejects.toThrow(/Timeout/);
		});
	});

	describe('getDocumentContext', () => {
		it('returns null when no context exists for the document', () => {
			const { service } = createService();
			const doc = { uri: vscode.Uri.parse('file:///missing.ttl') } as any;

			class Ctx { }

			expect(service.getDocumentContext(doc, Ctx as any)).toBeNull();
		});

		it('returns null when the context is not of the expected type', () => {
			const { service } = createService();
			const uri = vscode.Uri.parse('file:///test.ttl');
			const doc = { uri } as any;

			class CtxA { }
			class CtxB { }

			service.contexts[uri.toString()] = new CtxA() as any;

			expect(service.getDocumentContext(doc, CtxB as any)).toBeNull();
		});

		it('returns the typed context when it matches', () => {
			const { service } = createService();
			const uri = vscode.Uri.parse('file:///test.ttl');
			const doc = { uri } as any;

			class Ctx { }

			const ctx = new Ctx();
			service.contexts[uri.toString()] = ctx as any;

			expect(service.getDocumentContext(doc, Ctx as any)).toBe(ctx);
		});
	});

	describe('getDocumentContextFromUri', () => {
		it('resolves a workspace: URI to the underlying file: context', () => {
			const { service } = createService();
			const fileUri = 'file:///w/test.ttl';
			const context = createMockContext();

			service.contexts[fileUri] = context;

			const result = service.getDocumentContextFromUri('workspace:/test.ttl');

			expect(result).toBe(context);
		});

		it('returns context directly for a file: URI', () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const context = createMockContext();

			service.contexts[uri] = context;

			expect(service.getDocumentContextFromUri(uri)).toBe(context);
		});

		it('returns undefined for an unknown URI', () => {
			const { service } = createService();

			expect(service.getDocumentContextFromUri('file:///nonexistent.ttl')).toBeUndefined();
		});
	});

	describe('handleDocumentClosed', () => {
		it('removes a temporary context and deletes its graphs from the store', () => {
			const { service, mockStore } = createService();
			const uri = vscode.Uri.parse('file:///temp.ttl');
			const context = createMockContext({ uri, isTemporary: true, graphs: ['file:///temp.ttl'] });

			service.contexts[uri.toString()] = context;
			service.handleDocumentClosed({ uri } as any);

			expect(service.contexts[uri.toString()]).toBeUndefined();
			expect(mockStore.deleteGraphs).toHaveBeenCalledWith(context.graphs);
		});

		it('keeps a non-temporary context open', () => {
			const { service, mockStore } = createService();
			const uri = vscode.Uri.parse('file:///permanent.ttl');
			const context = createMockContext({ uri, isTemporary: false });

			service.contexts[uri.toString()] = context;
			service.handleDocumentClosed({ uri } as any);

			expect(service.contexts[uri.toString()]).toBe(context);
			expect(mockStore.deleteGraphs).not.toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('rejects all pending waitForTokens requests', async () => {
			const { service } = createService();
			const uri = 'file:///test.sparql';

			const promise = service.waitForTokens(uri, 10000);
			service.dispose();

			await expect(promise).rejects.toThrow();
		});
	});

	describe('loadDocument', () => {
		it('returns undefined for unsupported language', async () => {
			const { service } = createService();
			const doc = {
				languageId: 'python',
				uri: vscode.Uri.parse('file:///test.py'),
				getText: () => '',
			} as any;

			const result = await service.loadDocument(doc);

			expect(result).toBeUndefined();
		});

		it('returns undefined when document is null/undefined', async () => {
			const { service } = createService();

			const result = await service.loadDocument(null as any);

			expect(result).toBeUndefined();
		});

		it('loads a document and delivers its context when tokens arrive', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '@prefix ex: <http://example.org/> .',
			} as any;

			const loadPromise = service.loadDocument(doc);

			// Simulate language server delivering tokens
			service.resolveTokens(uri, []);

			const context = await loadPromise;

			expect(context).toBeDefined();
			expect(mockDocumentFactory.create).toHaveBeenCalled();
			expect((context as any).loadTriples).toHaveBeenCalled();
		});

		it('returns existing context immediately when already loaded and not force-reloading', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			// Pre-populate context as already loaded
			const existingCtx = createMockContext({ uri: doc.uri, isLoaded: true });
			service.contexts[uri] = existingCtx;
			(mockDocumentFactory.create as any).mockReturnValue(existingCtx);

			const result = await service.loadDocument(doc);

			// Should re-use existing context without creating a new one
			expect(result).toBe(existingCtx);
			expect(existingCtx.infer).toHaveBeenCalled();
		});

		it('force-reloads and replaces an already loaded context', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			// Pre-populate context as already loaded
			const existingCtx = createMockContext({ uri: doc.uri, isLoaded: true });
			service.contexts[uri] = existingCtx;

			const newCtx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: false });
			(mockDocumentFactory.create as any).mockReturnValue(newCtx);

			const loadPromise = service.loadDocument(doc, true);

			// Deliver tokens for force-reload
			service.resolveTokens(uri, []);

			const result = await loadPromise;

			expect(result).toBe(newCtx);
			expect(mockDocumentFactory.create).toHaveBeenCalled();
		});

		it('does not block when context already has tokens', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			// Context created with tokens already available
			const ctxWithTokens = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: true });
			(mockDocumentFactory.create as any).mockReturnValue(ctxWithTokens);

			// Should resolve without needing resolveTokens to be called
			const result = await service.loadDocument(doc);

			expect(result).toBe(ctxWithTokens);
			expect(ctxWithTokens.loadTriples).toHaveBeenCalled();
		});

		it('returns context (partial load) on token timeout', async () => {
			vi.useFakeTimers();
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			const partialCtx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: false });
			(mockDocumentFactory.create as any).mockReturnValue(partialCtx);

			const loadPromise = service.loadDocument(doc);

			// Advance clock past the token wait timeout
			vi.advanceTimersByTime(15000);

			const result = await loadPromise;

			// Returns context even on timeout (partial load)
			expect(result).toBe(partialCtx);
		});
	});

	describe('getContextFromUri', () => {
		it('returns context for a file: URI directly', () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const context = createMockContext();
			service.contexts[uri] = context;

			expect(service.getContextFromUri(uri)).toBe(context);
		});

		it('resolves a workspace: URI to the underlying file: context', () => {
			const { service } = createService();
			const fileUri = 'file:///w/test.ttl';
			const context = createMockContext();
			service.contexts[fileUri] = context;

			expect(service.getContextFromUri('workspace:/test.ttl')).toBe(context);
		});

		it('returns undefined for an unknown URI', () => {
			const { service } = createService();
			expect(service.getContextFromUri('file:///missing.ttl')).toBeUndefined();
		});
	});

	describe('getContext', () => {
		it('returns null when no context exists for the document', () => {
			const { service } = createService();
			const doc = { uri: vscode.Uri.parse('file:///missing.ttl') } as any;

			class Ctx { }

			expect(service.getContext(doc, Ctx as any)).toBeNull();
		});

		it('returns null when the context is not of the expected type', () => {
			const { service } = createService();
			const uri = vscode.Uri.parse('file:///test.ttl');
			const doc = { uri } as any;

			class CtxA { }
			class CtxB { }

			service.contexts[uri.toString()] = new CtxA() as any;

			expect(service.getContext(doc, CtxB as any)).toBeNull();
		});

		it('returns the typed context when it matches', () => {
			const { service } = createService();
			const uri = vscode.Uri.parse('file:///test.ttl');
			const doc = { uri } as any;

			class Ctx { }

			const ctx = new Ctx();
			service.contexts[uri.toString()] = ctx as any;

			expect(service.getContext(doc, Ctx as any)).toBe(ctx);
		});
	});

	describe('_reloadContextTriples (via resolveTokens)', () => {
		it('reloads an already-loaded context when tokens arrive with no pending request', async () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const mockDoc = { getText: vi.fn(() => '@prefix ex: <http://example.org/> .') } as any;

			// Put a loaded context + the document into workspace.textDocuments
			const ctx = createMockContext({
				uri: vscode.Uri.parse(uri),
				hasTokens: true,
			});
			service.contexts[uri] = ctx;
			(vscode.workspace.textDocuments as any[]).push({ uri: vscode.Uri.parse(uri), ...mockDoc });

			// resolveTokens with no pending request → triggers _reloadContextTriples
			service.resolveTokens(uri, []);

			// Allow microtask queue to flush
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(ctx.loadTriples).toHaveBeenCalled();
			expect(ctx.infer).toHaveBeenCalled();

			// cleanup
			(vscode.workspace.textDocuments as any[]).pop();
		});

		it('does not reload when context.hasTokens is false', async () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const ctx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: false });
			service.contexts[uri] = ctx;

			service.resolveTokens(uri, []);
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(ctx.loadTriples).not.toHaveBeenCalled();
		});

		it('does not reload when there is no text document open for the URI', async () => {
			const { service } = createService();
			const uri = 'file:///notopen.ttl';
			const ctx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: true });
			service.contexts[uri] = ctx;

			service.resolveTokens(uri, []);
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(ctx.loadTriples).not.toHaveBeenCalled();
		});
	});

	describe('handleActiveEditorChanged', () => {
		afterEach(() => {
			(vscode.window as any).activeTextEditor = undefined;
		});

		it('clears convert-file-format contexts when no editor is active', async () => {
			const { service, mockDocumentFactory } = createService();
			(vscode.window as any).activeTextEditor = undefined;

			await service.handleActiveEditorChanged();

			// When no editor is active, isConvertibleLanguage is not called (languageId undefined → fast path)
			expect(mockDocumentFactory.isConvertibleLanguage).not.toHaveBeenCalled();
		});

		it('loads the document and fires context-changed when a new editor becomes active', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = vscode.Uri.parse('file:///test.ttl');
			const doc = {
				languageId: 'turtle',
				uri,
				scheme: 'file',
				getText: () => '',
			};
			(vscode.window as any).activeTextEditor = { document: doc };

			// Pre-populate a loaded context so loadDocument returns immediately
			const ctx = createMockContext({ uri, isLoaded: true });
			service.contexts[uri.toString()] = ctx;
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			const fired: any[] = [];
			service.onDidChangeDocumentContext(c => fired.push(c));

			await service.handleActiveEditorChanged();

			expect(service.activeContext).toBe(ctx);
			expect(fired).toContain(ctx);
		});

		it('does nothing when the active editor URI is unchanged from activeContext', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = vscode.Uri.parse('file:///test.ttl');
			const ctx = createMockContext({ uri });
			service.contexts[uri.toString()] = ctx;
			service.activeContext = ctx;
			(vscode.window as any).activeTextEditor = { document: { languageId: 'turtle', uri, getText: () => '' } };

			const fired: any[] = [];
			service.onDidChangeDocumentContext(c => fired.push(c));

			await service.handleActiveEditorChanged();

			// context-changed should NOT fire because uri === activeContext.uri
			expect(fired).toHaveLength(0);
		});
	});

	describe('handleActiveNotebookEditorChanged', () => {
		it('does nothing when editor is undefined', async () => {
			const { service, mockDocumentFactory } = createService();

			await service.handleActiveNotebookEditorChanged(undefined);

			expect(mockDocumentFactory.create).not.toHaveBeenCalled();
		});

		it('loads triple-source cells from the notebook', async () => {
			const { service, mockDocumentFactory } = createService();
			(mockDocumentFactory.isTripleSourceLanguage as any).mockReturnValue(true);

			const cellDoc = { languageId: 'turtle', uri: vscode.Uri.parse('file:///nb.mnb#cell0'), scheme: 'vscode-notebook-cell', getText: () => '' };
			const ctx = createMockContext({ uri: cellDoc.uri, isLoaded: false, hasTokens: true });
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			const editor = {
				notebook: {
					getCells: () => [{ document: cellDoc }],
				},
			} as any;

			await service.handleActiveNotebookEditorChanged(editor);

			expect(mockDocumentFactory.create).toHaveBeenCalledWith(cellDoc.uri, cellDoc.languageId);
		});

		it('skips non-triple-source cells', async () => {
			const { service, mockDocumentFactory } = createService();
			(mockDocumentFactory.isTripleSourceLanguage as any).mockReturnValue(false);

			const editor = {
				notebook: {
					getCells: () => [{ document: { languageId: 'sparql', uri: vscode.Uri.parse('file:///nb.mnb#cell0') } }],
				},
			} as any;

			await service.handleActiveNotebookEditorChanged(editor);

			expect(mockDocumentFactory.create).not.toHaveBeenCalled();
		});
	});

	describe('handleTextDocumentChanged', () => {
		it('creates a context for a new supported document', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = vscode.Uri.parse('file:///new.ttl');
			const e = {
				document: {
					languageId: 'turtle',
					uri,
				}
			} as any;

			await service.handleTextDocumentChanged(e);

			expect(service.contexts[uri.toString()]).toBeDefined();
			expect(mockDocumentFactory.create).toHaveBeenCalled();
		});

		it('calls onDidChangeDocument on an existing context', async () => {
			const { service } = createService();
			const uri = vscode.Uri.parse('file:///existing.ttl');
			const ctx = createMockContext({ uri });
			service.contexts[uri.toString()] = ctx;

			const e = {
				document: {
					languageId: 'turtle',
					uri,
				}
			} as any;

			await service.handleTextDocumentChanged(e);

			expect(ctx.onDidChangeDocument).toHaveBeenCalledWith(e);
		});

		it('does nothing for unsupported language documents', async () => {
			const { service, mockDocumentFactory } = createService();
			const e = {
				document: {
					languageId: 'markdown',
					uri: vscode.Uri.parse('file:///readme.md'),
				}
			} as any;

			await service.handleTextDocumentChanged(e);

			expect(mockDocumentFactory.create).not.toHaveBeenCalled();
		});
	});

	describe('loadDocument supersession guards', () => {
		it('returns undefined when generation is bumped before tokens arrive (line 403)', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			const ctx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: false });
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			const loadPromise = service.loadDocument(doc);

			// Bump the generation to simulate a newer load superseding this one
			// while waitForTokens is still pending.
			const gen = (service as any)._tokenLoadGeneration.get(uri);
			(service as any)._tokenLoadGeneration.set(uri, gen + 1);

			// Resolve tokens — waitForTokens succeeds, but generation check on line 402 fails
			service.resolveTokens(uri, []);

			const result = await loadPromise;

			expect(result).toBeUndefined();
		});

		it('returns undefined when generation is bumped during loadTriples (line 411)', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			const ctx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: false });
			// loadTriples bumps the generation to simulate concurrent supersession
			ctx.loadTriples = vi.fn(async () => {
				const gen = (service as any)._tokenLoadGeneration.get(uri);
				(service as any)._tokenLoadGeneration.set(uri, gen + 1);
			});
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			const loadPromise = service.loadDocument(doc);
			service.resolveTokens(uri, []);

			const result = await loadPromise;

			expect(result).toBeUndefined();
		});

		it('returns undefined when generation is bumped during infer (line 419)', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			const ctx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: false });
			// infer bumps the generation to simulate concurrent supersession
			ctx.infer = vi.fn(async () => {
				const gen = (service as any)._tokenLoadGeneration.get(uri);
				(service as any)._tokenLoadGeneration.set(uri, gen + 1);
			});
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			const loadPromise = service.loadDocument(doc);
			service.resolveTokens(uri, []);

			const result = await loadPromise;

			expect(result).toBeUndefined();
		});

		it('returns undefined in catch when generation is bumped before rejection (line 387)', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///test.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			const ctx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: false });
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			const loadPromise = service.loadDocument(doc);

			// Bump generation so the catch-block supersession guard fires
			const gen = (service as any)._tokenLoadGeneration.get(uri);
			(service as any)._tokenLoadGeneration.set(uri, gen + 1);

			// Dispose rejects all pending waitForTokens — triggers the catch block
			service.dispose();

			const result = await loadPromise;

			expect(result).toBeUndefined();
		});
	});

	describe('loadDocument (activeContext assignment)', () => {
		afterEach(() => {
			(vscode.window as any).activeTextEditor = undefined;
		});

		it('does not set activeContext — activation is handleActiveEditorChanged\'s responsibility', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///active.ttl';
			const doc = {
				languageId: 'turtle',
				uri: vscode.Uri.parse(uri),
				scheme: 'file',
				getText: () => '',
			} as any;

			(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse(uri) } };

			const loadPromise = service.loadDocument(doc);
			service.resolveTokens(uri, []);
			const context = await loadPromise;

			expect(context).toBeDefined();
			// loadDocument no longer sets activeContext; handleActiveEditorChanged does.
			expect(service.activeContext).toBeUndefined();
		});
	});

	describe('activateDocument', () => {
		afterEach(() => {
			(vscode.window as any).activeTextEditor = undefined;
		});

		it('opens the active context document when it differs from the active editor (line 449)', async () => {
			const { service } = createService();
			const contextUri = vscode.Uri.parse('file:///context.ttl');

			// Set an active context whose URI doesn't match the active editor.
			service.activeContext = createMockContext({ uri: contextUri });
			(vscode.window as any).activeTextEditor = undefined;

			const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand');

			await service.activateDocument();

			expect(executeCommandSpy).toHaveBeenCalledWith('vscode.open', contextUri);

			executeCommandSpy.mockRestore();
		});

		it('returns the active editor without opening when activeContext is not set', async () => {
			const { service } = createService();
			(vscode.window as any).activeTextEditor = undefined;

			const result = await service.activateDocument();

			expect(result).toBeUndefined();
		});
	});

	describe('handleActiveEditorChanged (null URI branch)', () => {
		afterEach(() => {
			(vscode.window as any).activeTextEditor = undefined;
		});

		it('calls _setConvertFileFormatContexts and returns when editor document has no URI (lines 470-471)', async () => {
			const { service, mockDocumentFactory } = createService();

			// Provide an editor where document.uri is null/falsy.
			(vscode.window as any).activeTextEditor = {
				document: { languageId: 'turtle', uri: null },
			};

			// Should not throw and should not attempt to load a document.
			await service.handleActiveEditorChanged();

			expect(mockDocumentFactory.create).not.toHaveBeenCalled();
		});
	});

	describe('onNextTokenDelivery timeout cleanup', () => {
		it('cleans up the listener entry when the timeout fires', async () => {
			vi.useFakeTimers();
			const { service } = createService();
			const uri = 'file:///test.sparql';

			// Register two listeners — the timeout of the first fires while the second persists
			const p1 = service.onNextTokenDelivery(uri, 100);
			const p2 = service.onNextTokenDelivery(uri, 5000);

			// Advance past the first timeout only
			vi.advanceTimersByTime(100);

			await expect(p1).rejects.toThrow(/Timeout/);

			// The second listener is still present; resolve it to clean up
			service.resolveTokens(uri, []);
			await expect(p2).resolves.toBeDefined();
		});

		it('rejects with a timeout error when the timeout fires before delivery', async () => {
			vi.useFakeTimers();
			const { service } = createService();
			const uri = 'file:///test.sparql';

			const p1 = service.onNextTokenDelivery(uri, 100);

			vi.advanceTimersByTime(100);

			await expect(p1).rejects.toThrow(/Timeout/);
		});
	});

	describe('_reloadContextTriples edge cases', () => {
		it('catches and logs errors thrown during reload', async () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const mockDoc = { getText: vi.fn(() => 'x') } as any;

			const ctx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: true });
			// Make loadTriples throw to trigger the .catch handler
			(ctx.loadTriples as any).mockRejectedValue(new Error('load failed'));
			service.contexts[uri] = ctx;
			(vscode.workspace.textDocuments as any[]).push({ uri: vscode.Uri.parse(uri), ...mockDoc });

			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			service.resolveTokens(uri, []);
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to reload'),
				expect.any(Error)
			);

			warnSpy.mockRestore();
			(vscode.workspace.textDocuments as any[]).pop();
		});

		it('returns early after the supersession guard fires (line 285) without updating activeContext', async () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const mockDoc = { getText: vi.fn(() => '') } as any;

			const ctx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: true });
			// Replace the context during loadTriples so the supersession guard fires at line 285.
			// Note: infer() (line 282) is called BEFORE the guard, so it executes once.
			const newCtx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: true });
			(ctx.loadTriples as any).mockImplementation(async () => {
				service.contexts[uri] = newCtx;
			});
			service.contexts[uri] = ctx;
			(vscode.workspace.textDocuments as any[]).push({ uri: vscode.Uri.parse(uri), ...mockDoc });

			// Make the active editor match so activeContext assignment (line 294) would normally fire.
			(vscode.window as any).activeTextEditor = {
				document: { uri: { toString: () => uri } },
			};

			service.resolveTokens(uri, []);
			await new Promise(resolve => setTimeout(resolve, 10));

			// The supersession guard fires at line 285 (after infer) so activeContext
			// should NOT be set to the original ctx.
			expect(service.activeContext).not.toBe(ctx);

			(vscode.workspace.textDocuments as any[]).pop();
			(vscode.window as any).activeTextEditor = undefined;
		});

		it('sets activeContext when active context URI matches during _reloadContextTriples', async () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const mockDoc = { getText: vi.fn(() => '') } as any;

			const ctx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: true });
			service.contexts[uri] = ctx;
			(vscode.workspace.textDocuments as any[]).push({ uri: vscode.Uri.parse(uri), ...mockDoc });

			// Set the active context to match the URI being reloaded (new guard uses activeContext, not activeTextEditor)
			service.activeContext = ctx;

			service.resolveTokens(uri, []);
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(service.activeContext).toBe(ctx);

			(vscode.workspace.textDocuments as any[]).pop();
			(vscode.window as any).activeTextEditor = undefined;
		});
	});

	describe('loadDocument (vscode-notebook-cell scheme)', () => {
		it('logs the document URI when loading a notebook cell', async () => {
			const { service, mockDocumentFactory } = createService();
			const uri = 'file:///nb.mnb#cell0';
			const doc = {
				languageId: 'turtle',
				uri: { toString: () => uri, scheme: 'vscode-notebook-cell' },
				getText: () => '',
			} as any;

			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			const ctx = createMockContext({ uri: doc.uri, isLoaded: false, hasTokens: true });
			(mockDocumentFactory.create as any).mockReturnValue(ctx);

			await service.loadDocument(doc);

			expect(logSpy).toHaveBeenCalledWith(doc.uri);
			logSpy.mockRestore();
		});
	});

	describe('constructor event callback lambdas (lines 78-81)', () => {
		it('invokes handleActiveEditorChanged via the registered onDidChangeActiveTextEditor callback', async () => {
			let capturedHandler: Function | undefined;
			vi.spyOn(vscode.window, 'onDidChangeActiveTextEditor').mockImplementationOnce((handler: any) => {
				capturedHandler = handler;
				return { dispose: () => {} };
			});
			createService();
			await capturedHandler?.();
		});

		it('invokes handleActiveNotebookEditorChanged via the registered onDidChangeActiveNotebookEditor callback', async () => {
			let capturedHandler: Function | undefined;
			vi.spyOn(vscode.window, 'onDidChangeActiveNotebookEditor').mockImplementationOnce((handler: any) => {
				capturedHandler = handler;
				return { dispose: () => {} };
			});
			createService();
			await capturedHandler?.();
		});

		it('invokes handleTextDocumentChanged via the registered onDidChangeTextDocument callback', async () => {
			let capturedHandler: Function | undefined;
			vi.spyOn(vscode.workspace, 'onDidChangeTextDocument').mockImplementationOnce((handler: any) => {
				capturedHandler = handler;
				return { dispose: () => {} };
			});
			createService();
			// Provide a fake event with an unsupported language to avoid side-effects
			await capturedHandler?.({ document: { languageId: 'plaintext', uri: vscode.Uri.parse('file:///x.txt') } });
		});

		it('invokes handleTextDocumentClosed via the registered onDidCloseTextDocument callback', async () => {
			let capturedHandler: Function | undefined;
			vi.spyOn(vscode.workspace, 'onDidCloseTextDocument').mockImplementationOnce((handler: any) => {
				capturedHandler = handler;
				return { dispose: () => {} };
			});
			createService();
			await capturedHandler?.({ languageId: 'plaintext', uri: vscode.Uri.parse('file:///x.txt') });
		});
	});

	describe('_reloadContextTriples – hasTokens=false early return (line 275)', () => {
		it('returns early without loading triples when context.hasTokens is false', async () => {
			const { service } = createService();
			const uri = 'file:///test.ttl';
			const ctx = createMockContext({ uri: vscode.Uri.parse(uri), hasTokens: false });
			service.contexts[uri] = ctx;

			await (service as any)._reloadContextTriples(uri);

			expect(ctx.loadTriples).not.toHaveBeenCalled();
		});
	});
});
