import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));
vi.mock('@faubulous/mentor-rdf', () => ({
	VocabularyRepository: class {},
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

let mockSubscriptions: any[];
let mockWaitForIndexed: Mock;
let mockSupportedLanguages: Set<string>;
let mockDiagnosticCollectionDispose: ReturnType<typeof vi.fn>;
let mockDiagnosticCollectionClear: ReturnType<typeof vi.fn>;
let mockDiagnosticCollectionDelete: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { DocumentLintingService } from '@src/services/document/document-linting-service';

/** Constructs the service with the mocked dependencies. */
function makeService(): DocumentLintingService {
	return new DocumentLintingService(
		{ subscriptions: mockSubscriptions } as any,
		{ store: {} } as any,
		{ supportedLanguages: mockSupportedLanguages } as any,
		{ waitForIndexed: (...args: any[]) => mockWaitForIndexed(...args) } as any,
		{ contexts: {}, loadDocument: vi.fn() } as any,
	);
}

beforeEach(() => {
	mockSubscriptions = [];
	// Return a never-resolving promise to avoid callback side effects in tests
	mockWaitForIndexed = vi.fn(() => new Promise(() => {}));
	mockSupportedLanguages = new Set(['turtle', 'sparql', 'n3']);
	mockDiagnosticCollectionDispose = vi.fn();
	mockDiagnosticCollectionClear = vi.fn();
	mockDiagnosticCollectionDelete = vi.fn();

	(vscode.languages as any).createDiagnosticCollection = vi.fn(() => ({
		set: vi.fn(),
		delete: mockDiagnosticCollectionDelete,
		clear: mockDiagnosticCollectionClear,
		dispose: mockDiagnosticCollectionDispose,
	}));
});

describe('DocumentLintingService', () => {
	describe('constructor', () => {
		it('should create diagnostic collection', () => {
			makeService();
			expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('mentor-linting');
		});

		it('should register itself with extension context subscriptions', () => {
			const service = makeService();
			expect(mockSubscriptions).toContain(service);
		});

		it('should call waitForIndexed on workspace indexer service', () => {
			makeService();
			expect(mockWaitForIndexed).toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('should dispose the diagnostic collection', () => {
			const service = makeService();
			service.dispose();
			expect(mockDiagnosticCollectionDispose).toHaveBeenCalled();
		});

		it('should dispose all registered disposables', () => {
			const service = makeService();

			// After waitForIndexed resolves and subscribeChangeEvents is called,
			// disposables are added. For now test that dispose doesn't throw.
			expect(() => service.dispose()).not.toThrow();
		});
	});
});

describe('DocumentLintingService lint state', () => {
	/**
	 * Creates a service whose initial lint of one open document has run, and returns a function
	 * that reports a document context change for it, with a spy on the document lint.
	 */
	async function setup() {
		const store = { version: 1 };
		const document = { uri: vscode.Uri.parse('file:///w/a.ttl'), languageId: 'turtle', version: 1 };
		let contextHandler: ((context: any) => void) | undefined;

		(vscode.workspace as any).textDocuments = [document];
		(vscode.workspace as any).notebookDocuments = [];

		const contextService = {
			contexts: {},
			loadDocument: vi.fn(),
			getDocumentContextFromUri: vi.fn(() => ({})),
			onDidChangeDocumentContext: vi.fn((handler: (context: any) => void) => {
				contextHandler = handler;
				return { dispose: () => {} };
			}),
		};

		const service = new DocumentLintingService(
			{ subscriptions: mockSubscriptions } as any,
			{ store } as any,
			{ supportedLanguages: mockSupportedLanguages } as any,
			{ waitForIndexed: async () => {} } as any,
			contextService as any,
		);

		// Let the initial lint after indexing run.
		await new Promise(resolve => setTimeout(resolve, 0));

		const lint = vi.spyOn(service as any, '_validateDocument');
		const changeContext = () => contextHandler!({ uri: document.uri });

		return { service, store, document, lint, changeContext };
	}

	it('does not lint a document again when neither it nor the store changed', async () => {
		const { lint, changeContext } = await setup();

		changeContext();

		expect(lint).not.toHaveBeenCalled();
	});

	it('lints a document again when the store changed', async () => {
		const { store, lint, changeContext } = await setup();

		store.version = 2;
		changeContext();

		expect(lint).toHaveBeenCalledTimes(1);
	});

	it('lints a document again when it changed', async () => {
		const { document, lint, changeContext } = await setup();

		document.version = 2;
		changeContext();

		expect(lint).toHaveBeenCalledTimes(1);
	});

	it('lints a reopened document again, whose diagnostics were deleted on close', async () => {
		const { service, document, lint, changeContext } = await setup();

		(service as any)._onDocumentClosed(document);
		changeContext();

		expect(lint).toHaveBeenCalledTimes(1);
	});
});
