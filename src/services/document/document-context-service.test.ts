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
});
