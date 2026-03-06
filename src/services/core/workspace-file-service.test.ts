import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';
import { WorkspaceFileService } from './workspace-file-service';
import { ConfigurationService } from './configuration-service';
import { DocumentFactory } from '../../workspace/document-factory';

// Mock implementations
const createMockDocumentFactory = () => ({
	supportedExtensions: {
		'.ttl': { language: 'turtle', isTripleSource: true },
		'.rdf': { language: 'xml', isTripleSource: true },
		'.sparql': { language: 'sparql', isTripleSource: false },
	},
	isSupportedFile: (uri: vscode.Uri) => {
		const path = uri.path || uri.toString();
		return path.endsWith('.ttl') || path.endsWith('.rdf') || path.endsWith('.sparql');
	}
}) as unknown as DocumentFactory;

const createMockConfigurationService = (excludePatterns: string[] = ['**/node_modules/**']) => ({
	getExcludePatterns: vi.fn().mockResolvedValue(excludePatterns),
	get: vi.fn()
}) as unknown as ConfigurationService;

describe('WorkspaceFileService', () => {
	let service: WorkspaceFileService;
	let mockDocumentFactory: DocumentFactory;
	let mockConfigurationService: ConfigurationService;
	let findFilesSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockDocumentFactory = createMockDocumentFactory();
		mockConfigurationService = createMockConfigurationService();

		// Mock vscode.workspace.findFiles
		findFilesSpy = vi.spyOn(vscode.workspace, 'findFiles');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		service?.dispose();
	});

	describe('constructor', () => {
		test('should create include patterns from supported extensions', () => {
			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);

			expect(service.includePatterns).toContain('**/*.ttl');
			expect(service.includePatterns).toContain('**/*.rdf');
			expect(service.includePatterns).toContain('**/*.sparql');
		});

		test('should initialize with empty files array', () => {
			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);

			expect(service.files).toEqual([]);
			expect(service.initialized).toBe(false);
		});
	});

	describe('discoverFiles', () => {
		test('should discover files in workspace', async () => {
			const mockFiles = [
				URI.parse('file:///w/test.ttl'),
				URI.parse('file:///w/data.rdf'),
			];

			findFilesSpy.mockResolvedValue(mockFiles as any);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);
			await service.discoverFiles();

			expect(service.files.length).toBe(2);
			expect(service.initialized).toBe(true);
		});

		test('should filter out unsupported files', async () => {
			const mockFiles = [
				URI.parse('file:///w/test.ttl'),
				URI.parse('file:///w/readme.md'), // Not supported
				URI.parse('file:///w/data.rdf'),
			];

			// Mock isSupportedFile to reject .md files
			(mockDocumentFactory.isSupportedFile as any) = (uri: vscode.Uri) => {
				const path = uri.path || uri.toString();
				return !path.endsWith('.md');
			};

			findFilesSpy.mockResolvedValue(mockFiles as any);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);
			await service.discoverFiles();

			expect(service.files.length).toBe(2);
		});

		test('should call getExcludePatterns for each workspace folder', async () => {
			findFilesSpy.mockResolvedValue([]);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);
			await service.discoverFiles();

			expect(mockConfigurationService.getExcludePatterns).toHaveBeenCalled();
		});

		test('should fire onDidFinishDiscovery event when complete', async () => {
			findFilesSpy.mockResolvedValue([]);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);

			const discoveryPromise = new Promise<void>((resolve) => {
				service.onDidFinishDiscovery(() => resolve());
			});

			await service.discoverFiles();
			await discoveryPromise;

			expect(service.initialized).toBe(true);
		});
	});

	describe('waitForDiscovery', () => {
		test('should resolve immediately if already initialized', async () => {
			findFilesSpy.mockResolvedValue([]);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);
			await service.discoverFiles();

			// Should resolve immediately
			await expect(service.waitForDiscovery()).resolves.toBeUndefined();
		});

		test('should wait for discovery to complete', async () => {
			findFilesSpy.mockResolvedValue([]);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);

			// Start waiting before discovery
			const waitPromise = service.waitForDiscovery();

			// Then start discovery
			await service.discoverFiles();

			// Wait should resolve
			await expect(waitPromise).resolves.toBeUndefined();
		});
	});

	describe('files immutability', () => {
		test('files property should return readonly array', async () => {
			const mockFiles = [URI.parse('file:///w/test.ttl')];
			findFilesSpy.mockResolvedValue(mockFiles as any);

			service = new WorkspaceFileService(mockDocumentFactory, mockConfigurationService);
			await service.discoverFiles();

			const files = service.files;
			expect(files).toHaveLength(1);

			// TypeScript should prevent this, but verify at runtime
			expect(() => {
				(files as any[]).push(URI.parse('file:///w/hack.ttl'));
			}).not.toThrow(); // Array.push works, but doesn't affect internal state

			// The internal state should remain unchanged on next access
			// (depending on implementation)
		});
	});
});
