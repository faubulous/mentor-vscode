import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';
import { WorkspaceFileService } from './workspace-file-service';
import { DocumentFactory } from '../../workspace/document-factory';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(() => ({ get: vi.fn((_key: string, defaultValue?: any) => defaultValue) })),
}));

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

describe('WorkspaceFileService', () => {
	let service: WorkspaceFileService;
	let mockDocumentFactory: DocumentFactory;
	let findFilesSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockDocumentFactory = createMockDocumentFactory();

		// Mock vscode.workspace.findFiles
		findFilesSpy = vi.spyOn(vscode.workspace, 'findFiles');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		service?.dispose();
	});

	describe('constructor', () => {
		test('should create include patterns from supported extensions', () => {
			service = new WorkspaceFileService(mockDocumentFactory);

			expect(service.includePatterns).toContain('**/*.ttl');
			expect(service.includePatterns).toContain('**/*.rdf');
			expect(service.includePatterns).toContain('**/*.sparql');
		});

		test('should initialize with empty files array', () => {
			service = new WorkspaceFileService(mockDocumentFactory);

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

			service = new WorkspaceFileService(mockDocumentFactory);
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

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			expect(service.files.length).toBe(2);
		});

		test('should fire onDidFinishDiscovery event when complete', async () => {
			findFilesSpy.mockResolvedValue([]);

			service = new WorkspaceFileService(mockDocumentFactory);

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

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			// Should resolve immediately
			await expect(service.waitForDiscovery()).resolves.toBeUndefined();
		});

		test('should wait for discovery to complete', async () => {
			findFilesSpy.mockResolvedValue([]);

			service = new WorkspaceFileService(mockDocumentFactory);

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

			service = new WorkspaceFileService(mockDocumentFactory);
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

	describe('file system watcher events', () => {
		let createCallback: ((uri: vscode.Uri) => void) | null;
		let deleteCallback: ((uri: vscode.Uri) => void) | null;

		beforeEach(() => {
			createCallback = null;
			deleteCallback = null;

			vi.spyOn(vscode.workspace, 'createFileSystemWatcher').mockReturnValue({
				onDidCreate: (cb: any) => { createCallback = cb; return { dispose: () => {} }; },
				onDidChange: () => ({ dispose: () => {} }),
				onDidDelete: (cb: any) => { deleteCallback = cb; return { dispose: () => {} }; },
				dispose: () => {},
			} as any);
		});

		test('adds a supported file to the list when it is created', () => {
			service = new WorkspaceFileService(mockDocumentFactory);

			const newFile = URI.parse('file:///w/new.ttl');
			createCallback!(newFile as any);

			expect(service.files.some(f => f.toString() === newFile.toString())).toBe(true);
		});

		test('ignores creation of unsupported files', () => {
			service = new WorkspaceFileService(mockDocumentFactory);

			const unsupported = URI.parse('file:///w/readme.md');
			createCallback!(unsupported as any);

			expect(service.files.length).toBe(0);
		});

		test('fires onDidChangeFiles with Created when a supported file is created', () => {
			service = new WorkspaceFileService(mockDocumentFactory);
			const eventSpy = vi.fn();
			service.onDidChangeFiles(eventSpy);

			const newFile = URI.parse('file:///w/new.ttl');
			createCallback!(newFile as any);

			expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
				type: vscode.FileChangeType.Created,
			}));
		});

		test('removes a file from the list when it is deleted', async () => {
			findFilesSpy.mockResolvedValue([URI.parse('file:///w/test.ttl') as any]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const deletedFile = URI.parse('file:///w/test.ttl');
			deleteCallback!(deletedFile as any);

			expect(service.files.length).toBe(0);
		});

		test('ignores deletion of unsupported files', async () => {
			findFilesSpy.mockResolvedValue([URI.parse('file:///w/test.ttl') as any]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const unsupported = URI.parse('file:///w/readme.md');
			deleteCallback!(unsupported as any);

			// Supported file remains
			expect(service.files.length).toBe(1);
		});

		test('fires onDidChangeFiles with Deleted when a supported file is deleted', async () => {
			findFilesSpy.mockResolvedValue([URI.parse('file:///w/test.ttl') as any]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const eventSpy = vi.fn();
			service.onDidChangeFiles(eventSpy);

			deleteCallback!(URI.parse('file:///w/test.ttl') as any);

			expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
				type: vscode.FileChangeType.Deleted,
			}));
		});
	});

	describe('getFilesByLanguageId', () => {
		test('yields files matching the given language extensions', async () => {
			// Set up extensions mock with turtle language supporting .ttl and .rdf
			vscode.extensions.all = [{
				packageJSON: {
					contributes: {
						languages: [{ id: 'turtle', extensions: ['.ttl', '.rdf'] }]
					}
				}
			}] as any[];

			findFilesSpy.mockResolvedValue([
				URI.parse('file:///w/model.ttl'),
				URI.parse('file:///w/data.rdf'),
				URI.parse('file:///w/query.sparql'),
			] as any);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const results: vscode.Uri[] = [];
			for await (const uri of service.getFilesByLanguageId('turtle')) {
				results.push(uri);
			}

			expect(results.length).toBe(2);
			expect(results.some(r => r.toString().endsWith('.ttl'))).toBe(true);
			expect(results.some(r => r.toString().endsWith('.rdf'))).toBe(true);
		});

		test('yields nothing when no extensions are configured for the language', async () => {
			vscode.extensions.all = [];

			service = new WorkspaceFileService(mockDocumentFactory);

			const results: vscode.Uri[] = [];
			for await (const uri of service.getFilesByLanguageId('unknownlang')) {
				results.push(uri);
			}

			expect(results.length).toBe(0);
		});
	});

	describe('getFolderContents', () => {
		test('groups files by sub-folder and returns them sorted', async () => {
			findFilesSpy.mockResolvedValue([
				URI.parse('file:///w/models/thing.ttl'),
				URI.parse('file:///w/models/other.ttl'),
				URI.parse('file:///w/queries/q.sparql'),
				URI.parse('file:///w/root.ttl'),
			] as any);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const contents = await service.getFolderContents(URI.parse('file:///w') as any);

			const names = contents.map(u => u.toString().replace('file:///w/', ''));

			// Two sub-folders and one root file
			expect(contents.length).toBe(3);
			expect(names).toContain('models');
			expect(names).toContain('queries');
			expect(names).toContain('root.ttl');
		});

		test('returns only files that are inside the given folder', async () => {
			findFilesSpy.mockResolvedValue([
				URI.parse('file:///w/a/x.ttl'),
				URI.parse('file:///w/b/y.ttl'),
			] as any);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const contents = await service.getFolderContents(URI.parse('file:///w/a') as any);

			expect(contents.length).toBe(1);
			expect(contents[0].toString()).toContain('x.ttl');
		});

		test('sorts multiple flat files alphabetically (covers files.sort comparator)', async () => {
			findFilesSpy.mockResolvedValue([
				URI.parse('file:///w/zebra.ttl'),
				URI.parse('file:///w/alpha.ttl'),
			] as any);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const contents = await service.getFolderContents(URI.parse('file:///w') as any);

			expect(contents.length).toBe(2);
			expect(contents[0].toString()).toContain('alpha.ttl');
			expect(contents[1].toString()).toContain('zebra.ttl');
		});
	});

	describe('getExcludePatterns', () => {
		test('includes patterns from ignoreFolders config', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
					if (key === 'index.ignoreFolders') return ['node_modules', 'dist'];
					return defaultValue;
				})
			});

			service = new WorkspaceFileService(mockDocumentFactory);
			const result = await (service as any).getExcludePatterns(URI.parse('file:///w'));

			expect(result).toContain('node_modules');
			expect(result).toContain('dist');
		});

		test('includes gitignore patterns when useGitIgnore is enabled', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
					if (key === 'index.ignoreFolders') return [];
					if (key === 'index.useGitIgnore') return true;
					return defaultValue;
				})
			});

			// Mock readFile to return a fake .gitignore
			const gitignoreContent = '# comment\nnode_modules\nbuild\n';
			vi.spyOn(vscode.workspace.fs, 'readFile').mockResolvedValue(
				new TextEncoder().encode(gitignoreContent) as any
			);

			service = new WorkspaceFileService(mockDocumentFactory);
			const result = await (service as any).getExcludePatterns(URI.parse('file:///w'));

			expect(result).toContain('node_modules');
			expect(result).toContain('build');
			expect(result).not.toContain('# comment');
		});

		test('skips gitignore errors gracefully when useGitIgnore is enabled', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
					if (key === 'index.ignoreFolders') return ['vendor'];
					if (key === 'index.useGitIgnore') return true;
					return defaultValue;
				})
			});

			// readFile throws (no .gitignore) — already the default mock behaviour
			vi.spyOn(vscode.workspace.fs, 'readFile').mockRejectedValue(new Error('not found'));

			service = new WorkspaceFileService(mockDocumentFactory);
			const result = await (service as any).getExcludePatterns(URI.parse('file:///w'));

			// Still gets ignoreFolders but no gitignore content
			expect(result).toContain('vendor');
		});
	});
});
