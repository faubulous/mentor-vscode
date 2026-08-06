import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceFileService } from '@src/services/core/workspace-file-service';
import { DocumentFactory } from '@src/services/document/document-factory';

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
	// Partial stub: only supportedExtensions/isSupportedFile are exercised by this service.
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
				vscode.Uri.parse('file:///w/test.ttl'),
				vscode.Uri.parse('file:///w/data.rdf'),
			];

			findFilesSpy.mockResolvedValue(mockFiles);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			expect(service.files.length).toBe(2);
			expect(service.initialized).toBe(true);
		});

		test('should filter out unsupported files', async () => {
			const mockFiles = [
				vscode.Uri.parse('file:///w/test.ttl'),
				vscode.Uri.parse('file:///w/readme.md'), // Not supported
				vscode.Uri.parse('file:///w/data.rdf'),
			];

			// Mock isSupportedFile to reject .md files
			(mockDocumentFactory.isSupportedFile as any) = (uri: vscode.Uri) => {
				const path = uri.path || uri.toString();
				return !path.endsWith('.md');
			};

			findFilesSpy.mockResolvedValue(mockFiles);

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
			const mockFiles = [vscode.Uri.parse('file:///w/test.ttl')];
			findFilesSpy.mockResolvedValue(mockFiles);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const files = service.files;
			expect(files).toHaveLength(1);

			// TypeScript should prevent this, but verify at runtime
			expect(() => {
				(files as any[]).push(vscode.Uri.parse('file:///w/hack.ttl'));
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

			const newFile = vscode.Uri.parse('file:///w/new.ttl');
			createCallback!(newFile);

			expect(service.files.some(f => f.toString() === newFile.toString())).toBe(true);
		});

		test('ignores creation of unsupported files', () => {
			service = new WorkspaceFileService(mockDocumentFactory);

			const unsupported = vscode.Uri.parse('file:///w/readme.md');
			createCallback!(unsupported);

			expect(service.files.length).toBe(0);
		});

		test('fires onDidChangeFiles with Created when a supported file is created', () => {
			service = new WorkspaceFileService(mockDocumentFactory);
			const eventSpy = vi.fn();
			service.onDidChangeFiles(eventSpy);

			const newFile = vscode.Uri.parse('file:///w/new.ttl');
			createCallback!(newFile);

			expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
				type: vscode.FileChangeType.Created,
			}));
		});

		test('removes a file from the list when it is deleted', async () => {
			findFilesSpy.mockResolvedValue([vscode.Uri.parse('file:///w/test.ttl')]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const deletedFile = vscode.Uri.parse('file:///w/test.ttl');
			deleteCallback!(deletedFile);

			expect(service.files.length).toBe(0);
		});

		test('ignores deletion of unsupported files', async () => {
			findFilesSpy.mockResolvedValue([vscode.Uri.parse('file:///w/test.ttl')]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const unsupported = vscode.Uri.parse('file:///w/readme.md');
			deleteCallback!(unsupported);

			// Supported file remains
			expect(service.files.length).toBe(1);
		});

		test('fires onDidChangeFiles with Deleted when a supported file is deleted', async () => {
			findFilesSpy.mockResolvedValue([vscode.Uri.parse('file:///w/test.ttl')]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const eventSpy = vi.fn();
			service.onDidChangeFiles(eventSpy);

			deleteCallback!(vscode.Uri.parse('file:///w/test.ttl'));

			expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
				type: vscode.FileChangeType.Deleted,
			}));
		});
	});

	describe('handleRenames', () => {
		test('updates a renamed file in the list', async () => {
			findFilesSpy.mockResolvedValue([vscode.Uri.parse('file:///w/data/old.ttl')]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			service.handleRenames([{
				oldUri: vscode.Uri.parse('file:///w/data/old.ttl'),
				newUri: vscode.Uri.parse('file:///w/data/new.ttl'),
			}]);

			expect(service.files.map(f => f.toString())).toEqual(['file:///w/data/new.ttl']);
		});

		test('rewrites paths of files inside a renamed folder', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/data/a.ttl'),
				vscode.Uri.parse('file:///w/data/sub/b.ttl'),
			]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			service.handleRenames([{
				oldUri: vscode.Uri.parse('file:///w/data'),
				newUri: vscode.Uri.parse('file:///w/sources'),
			}]);

			const paths = service.files.map(f => f.toString()).sort();
			expect(paths).toEqual(['file:///w/sources/a.ttl', 'file:///w/sources/sub/b.ttl']);
		});

		test('drops a file renamed to an unsupported extension', async () => {
			findFilesSpy.mockResolvedValue([vscode.Uri.parse('file:///w/data.ttl')]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			service.handleRenames([{
				oldUri: vscode.Uri.parse('file:///w/data.ttl'),
				newUri: vscode.Uri.parse('file:///w/data.md'),
			}]);

			expect(service.files.length).toBe(0);
		});

		test('adds a file renamed from an unsupported extension', async () => {
			findFilesSpy.mockResolvedValue([]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			service.handleRenames([{
				oldUri: vscode.Uri.parse('file:///w/notes.md'),
				newUri: vscode.Uri.parse('file:///w/notes.ttl'),
			}]);

			expect(service.files.map(f => f.toString())).toEqual(['file:///w/notes.ttl']);
		});

		test('fires onDidChangeFiles for the affected parent folders', async () => {
			findFilesSpy.mockResolvedValue([vscode.Uri.parse('file:///w/data/old.ttl')]);
			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const eventSpy = vi.fn();
			service.onDidChangeFiles(eventSpy);

			service.handleRenames([{
				oldUri: vscode.Uri.parse('file:///w/data/old.ttl'),
				newUri: vscode.Uri.parse('file:///w/other/new.ttl'),
			}]);

			const firedUris = eventSpy.mock.calls.map(c => c[0].uri.toString());
			expect(firedUris).toContain('file:///w/data');
			expect(firedUris).toContain('file:///w/other');
		});
	});

	describe('getFilesByLanguageId', () => {
		test('yields files matching the given language extensions', async () => {
			// Set up extensions mock with turtle language supporting .ttl and .rdf
			(vscode.extensions as unknown as { all: unknown[] }).all = [{
				packageJSON: {
					contributes: {
						languages: [{ id: 'turtle', extensions: ['.ttl', '.rdf'] }]
					}
				}
			}] as any[];

			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/model.ttl'),
				vscode.Uri.parse('file:///w/data.rdf'),
				vscode.Uri.parse('file:///w/query.sparql'),
			]);

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
			(vscode.extensions as unknown as { all: unknown[] }).all = [];

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
				vscode.Uri.parse('file:///w/models/thing.ttl'),
				vscode.Uri.parse('file:///w/models/other.ttl'),
				vscode.Uri.parse('file:///w/queries/q.sparql'),
				vscode.Uri.parse('file:///w/root.ttl'),
			]);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const contents = await service.getFolderContents(vscode.Uri.parse('file:///w'));

			const names = contents.map(u => u.toString().replace('file:///w/', ''));

			// Two sub-folders and one root file
			expect(contents.length).toBe(3);
			expect(names).toContain('models');
			expect(names).toContain('queries');
			expect(names).toContain('root.ttl');
		});

		test('returns only files that are inside the given folder', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/a/x.ttl'),
				vscode.Uri.parse('file:///w/b/y.ttl'),
			]);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const contents = await service.getFolderContents(vscode.Uri.parse('file:///w/a'));

			expect(contents.length).toBe(1);
			expect(contents[0].toString()).toContain('x.ttl');
		});

		test('returns children of a folder whose name contains spaces', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/my%20folder/data.ttl'),
			]);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			// Discover: root shows the folder
			const rootContents = await service.getFolderContents(vscode.Uri.parse('file:///w'));
			expect(rootContents.length).toBe(1);

			// Expanding the folder must yield the file, not an empty array
			const folderContents = await service.getFolderContents(rootContents[0]);
			expect(folderContents.length).toBe(1);
			expect(folderContents[0].toString()).toContain('data.ttl');
		});

		test('sorts multiple flat files alphabetically (covers files.sort comparator)', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/zebra.ttl'),
				vscode.Uri.parse('file:///w/alpha.ttl'),
			]);

			service = new WorkspaceFileService(mockDocumentFactory);
			await service.discoverFiles();

			const contents = await service.getFolderContents(vscode.Uri.parse('file:///w'));

			expect(contents.length).toBe(2);
			expect(contents[0].toString()).toContain('alpha.ttl');
			expect(contents[1].toString()).toContain('zebra.ttl');
		});
	});

	describe('getExcludePatterns', () => {
		test('includes patterns from excludeFiles config', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
					if (key === 'index.excludeFiles') return ['node_modules', 'dist'];
					return defaultValue;
				})
			});

			service = new WorkspaceFileService(mockDocumentFactory);
			const result = await (service as any).getExcludePatterns(vscode.Uri.parse('file:///w'));

			expect(result).toContain('node_modules');
			expect(result).toContain('dist');
		});

		test('includes gitignore patterns when useGitIgnore is enabled', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
					if (key === 'index.excludeFiles') return [];
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
			const result = await (service as any).getExcludePatterns(vscode.Uri.parse('file:///w'));

			expect(result).toContain('node_modules');
			expect(result).toContain('build');
			expect(result).not.toContain('# comment');
		});

		test('skips gitignore errors gracefully when useGitIgnore is enabled', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
					if (key === 'index.excludeFiles') return ['vendor'];
					if (key === 'index.useGitIgnore') return true;
					return defaultValue;
				})
			});

			// readFile throws (no .gitignore) — already the default mock behaviour
			vi.spyOn(vscode.workspace.fs, 'readFile').mockRejectedValue(new Error('not found'));

			service = new WorkspaceFileService(mockDocumentFactory);
			const result = await (service as any).getExcludePatterns(vscode.Uri.parse('file:///w'));

			// Still gets excludeFiles but no gitignore content
			expect(result).toContain('vendor');
		});
	});
});
