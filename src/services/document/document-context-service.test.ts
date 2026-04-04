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
});
