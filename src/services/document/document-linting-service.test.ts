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
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') {
				return { subscriptions: mockSubscriptions };
			}
			if (token === 'WorkspaceIndexerService') {
				return { waitForIndexed: (...args: any[]) => mockWaitForIndexed(...args) };
			}
			if (token === 'DocumentFactory') {
				return { supportedLanguages: mockSupportedLanguages };
			}
			if (token === 'DocumentContextService') {
				return { contexts: {}, loadDocument: vi.fn() };
			}
			if (token === 'VocabularyRepository') {
				return { store: {} };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { DocumentLintingService } from '@src/services/document/document-linting-service';

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
			new DocumentLintingService();
			expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('mentor-linting');
		});

		it('should register itself with extension context subscriptions', () => {
			const service = new DocumentLintingService();
			expect(mockSubscriptions).toContain(service);
		});

		it('should call waitForIndexed on workspace indexer service', () => {
			new DocumentLintingService();
			expect(mockWaitForIndexed).toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('should dispose the diagnostic collection', () => {
			const service = new DocumentLintingService();
			service.dispose();
			expect(mockDiagnosticCollectionDispose).toHaveBeenCalled();
		});

		it('should dispose all registered disposables', () => {
			const service = new DocumentLintingService();

			// After waitForIndexed resolves and subscribeChangeEvents is called,
			// disposables are added. For now test that dispose doesn't throw.
			expect(() => service.dispose()).not.toThrow();
		});
	});
});
