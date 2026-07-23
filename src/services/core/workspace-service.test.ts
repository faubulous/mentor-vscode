import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceService } from '@src/services/core/workspace-service';

describe('WorkspaceService', () => {
	let service: WorkspaceService;
	let findFilesSpy: ReturnType<typeof vi.spyOn>;
	let readFileSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		service = new WorkspaceService();
		findFilesSpy = vi.spyOn(vscode.workspace, 'findFiles');
		readFileSpy = vi.spyOn(vscode.workspace.fs, 'readFile');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Helper to create a mock `.code-workspace` file content as Uint8Array.
	 */
	function encodeWorkspaceFile(content: object): Uint8Array {
		return new TextEncoder().encode(JSON.stringify(content));
	}

	describe('createDescriptor', () => {
		describe('Linux paths', () => {
			const rootUri = vscode.Uri.parse('file:///home/user/project');

			test('should extract ID from workspace filename', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('my-workspace');
			});

			test('should compute relative path for a file at the project root', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});

			test('should compute relative path for a nested file', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/project/sub/dir/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.relativePath).toBe('sub/dir/my-workspace.code-workspace');
			});

			test('should set absolutePath to the fsPath of the URI', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.absolutePath).toBe('/home/user/project/my-workspace.code-workspace');
			});

			test('should preserve the original URI', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.uri).toBe(fileUri);
			});

			test('should handle deeply nested workspace files', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/project/a/b/c/d/test.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('test');
				expect(descriptor.relativePath).toBe('a/b/c/d/test.code-workspace');
			});

			test('should handle workspace root with trailing slash', () => {
				const rootWithSlash = vscode.Uri.parse('file:///home/user/project/');
				const fileUri = vscode.Uri.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootWithSlash);

				expect(descriptor.id).toBe('my-workspace');
				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});
		});

		describe('Windows paths', () => {
			const rootUri = vscode.Uri.parse('file:///c:/Users/user/project');

			test('should extract ID from workspace filename', () => {
				const fileUri = vscode.Uri.parse('file:///c:/Users/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('my-workspace');
			});

			test('should compute relative path with forward slashes', () => {
				const fileUri = vscode.Uri.parse('file:///c:/Users/user/project/sub/dir/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.relativePath).toBe('sub/dir/my-workspace.code-workspace');
			});

			test('should set absolutePath to the fsPath of the URI', () => {
				const fileUri = vscode.Uri.parse('file:///c:/Users/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.absolutePath).toBe(fileUri.fsPath);
			});

			test('should handle workspace files at the project root', () => {
				const fileUri = vscode.Uri.parse('file:///c:/Users/user/project/test.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('test');
				expect(descriptor.relativePath).toBe('test.code-workspace');
			});

			test('should handle uppercase drive letters', () => {
				const root = vscode.Uri.parse('file:///C:/Users/user/project');
				const fileUri = vscode.Uri.parse('file:///C:/Users/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, root);

				expect(descriptor.id).toBe('my-workspace');
				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});

			test('should handle deeply nested workspace files', () => {
				const fileUri = vscode.Uri.parse('file:///c:/Users/user/project/a/b/c/test.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('test');
				expect(descriptor.relativePath).toBe('a/b/c/test.code-workspace');
			});
		});

		describe('UNC paths', () => {
			test('should handle UNC network paths', () => {
				const rootUri = vscode.Uri.parse('file://server/share/project');
				const fileUri = vscode.Uri.parse('file://server/share/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('my-workspace');
				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});
		});

		describe('rootOffset and rootUri', () => {
			const rootUri = vscode.Uri.parse('file:///home/user/monorepo');

			test('should have undefined rootOffset and rootUri when no content is provided', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.rootOffset).toBeUndefined();
				expect(descriptor.rootUri).toBeUndefined();
			});

			test('should have undefined rootOffset and rootUri when content has no settings', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri, { folders: [] });

				expect(descriptor.rootOffset).toBeUndefined();
				expect(descriptor.rootUri).toBeUndefined();
			});

			test('should have undefined rootOffset and rootUri when settings has no rootOffset', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri, {
					settings: { 'some.other.setting': true }
				});

				expect(descriptor.rootOffset).toBeUndefined();
				expect(descriptor.rootUri).toBeUndefined();
			});

			test('should resolve rootUri with rootOffset "." for workspace at monorepo root', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri, {
					settings: { 'mentor.workspace.rootOffset': '.' }
				});

				expect(descriptor.rootOffset).toBe('.');
				expect(descriptor.rootUri).toBeDefined();
				expect(descriptor.rootUri!.path).toBe('/home/user/monorepo');
			});

			test('should resolve rootUri with rootOffset ".." for workspace in a subdirectory', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/monorepo/tools/backend.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri, {
					settings: { 'mentor.workspace.rootOffset': '..' }
				});

				expect(descriptor.rootOffset).toBe('..');
				expect(descriptor.rootUri).toBeDefined();
				expect(descriptor.rootUri!.path).toBe('/home/user/monorepo');
			});

			test('should resolve rootUri with rootOffset "../.." for deeply nested workspace', () => {
				const fileUri = vscode.Uri.parse('file:///home/user/monorepo/a/b/deep.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri, {
					settings: { 'mentor.workspace.rootOffset': '../..' }
				});

				expect(descriptor.rootOffset).toBe('../..');
				expect(descriptor.rootUri).toBeDefined();
				expect(descriptor.rootUri!.path).toBe('/home/user/monorepo');
			});

			test('should resolve rootUri on Windows paths', () => {
				const winRoot = vscode.Uri.parse('file:///c:/Projects/monorepo');
				const fileUri = vscode.Uri.parse('file:///c:/Projects/monorepo/tools/backend.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, winRoot, {
					settings: { 'mentor.workspace.rootOffset': '..' }
				});

				expect(descriptor.rootUri).toBeDefined();
				expect(descriptor.rootUri!.path).toBe('/c:/Projects/monorepo');
			});

			test('should produce identical rootUri for workspace files at different depths', () => {
				const frontendUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
				const backendUri = vscode.Uri.parse('file:///home/user/monorepo/tools/backend.code-workspace');

				const frontendDescriptor = WorkspaceService.createDescriptor(frontendUri, rootUri, {
					settings: { 'mentor.workspace.rootOffset': '.' }
				});

				const backendDescriptor = WorkspaceService.createDescriptor(backendUri, rootUri, {
					settings: { 'mentor.workspace.rootOffset': '..' }
				});

				expect(frontendDescriptor.rootUri!.path).toBe(backendDescriptor.rootUri!.path);
			});
		});
	});

	describe('resolveRootUri', () => {
		test('should resolve "." to the workspace file directory', () => {
			const fileUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
			const rootUri = WorkspaceService.resolveRootUri(fileUri, '.');

			expect(rootUri.path).toBe('/home/user/monorepo');
		});

		test('should resolve ".." to the parent of the workspace file directory', () => {
			const fileUri = vscode.Uri.parse('file:///home/user/monorepo/tools/backend.code-workspace');
			const rootUri = WorkspaceService.resolveRootUri(fileUri, '..');

			expect(rootUri.path).toBe('/home/user/monorepo');
		});

		test('should resolve a named subdirectory offset', () => {
			const fileUri = vscode.Uri.parse('file:///home/user/monorepo/frontend.code-workspace');
			const rootUri = WorkspaceService.resolveRootUri(fileUri, 'sub');

			expect(rootUri.path).toBe('/home/user/monorepo/sub');
		});
	});

	describe('getIdFromFilename', () => {
		test('should extract ID from a simple filename', () => {
			expect(WorkspaceService.getIdFromFilename('/home/user/project/my-workspace.code-workspace')).toBe('my-workspace');
		});

		test('should extract ID from a filename without directory', () => {
			expect(WorkspaceService.getIdFromFilename('test.code-workspace')).toBe('test');
		});
	});

	describe('discoverWorkspaces', () => {
		test('should discover workspace files and populate the list', async () => {
			const mockFiles = [
				vscode.Uri.parse('file:///w/my-workspace.code-workspace'),
				vscode.Uri.parse('file:///w/other.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({ folders: [] }));

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(2);
			expect(service.workspaces[0].id).toBe('my-workspace');
			expect(service.workspaces[1].id).toBe('other');
		});

		test('should return empty list when no workspace files exist', async () => {
			findFilesSpy.mockResolvedValue([]);

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(0);
		});

		test('should not call findFiles when no workspace folders are open', async () => {
			const original = vscode.workspace.workspaceFolders;
			(vscode.workspace as any).workspaceFolders = undefined;

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(0);
			expect(findFilesSpy).not.toHaveBeenCalled();

			(vscode.workspace as any).workspaceFolders = original;
		});

		test('should clear previous results on re-discovery', async () => {
			findFilesSpy.mockResolvedValueOnce([
				vscode.Uri.parse('file:///w/first.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({ folders: [] }));

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(1);
			expect(service.workspaces[0].id).toBe('first');

			findFilesSpy.mockResolvedValueOnce([
				vscode.Uri.parse('file:///w/second.code-workspace'),
			]);

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(1);
			expect(service.workspaces[0].id).toBe('second');
		});

		test('should use the correct glob pattern', async () => {
			findFilesSpy.mockResolvedValue([]);

			await service.discoverWorkspaces();

			expect(findFilesSpy).toHaveBeenCalledWith('**/*.code-workspace');
		});

		test('should compute correct relative paths from workspace root', async () => {
			const mockFiles = [
				vscode.Uri.parse('file:///w/sub/dir/test.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({ folders: [] }));

			await service.discoverWorkspaces();

			expect(service.workspaces[0].relativePath).toBe('sub/dir/test.code-workspace');
		});

		test('should parse rootOffset from workspace file content', async () => {
			const mockFiles = [
				vscode.Uri.parse('file:///w/frontend.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({
				folders: [{ path: 'ui' }],
				settings: { 'mentor.workspace.rootOffset': '.' }
			}));

			await service.discoverWorkspaces();

			expect(service.workspaces[0].rootOffset).toBe('.');
			expect(service.workspaces[0].rootUri).toBeDefined();
			expect(service.workspaces[0].rootUri!.path).toBe('/w');
		});

		test('should handle workspace files that cannot be read', async () => {
			const mockFiles = [
				vscode.Uri.parse('file:///w/broken.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles);
			readFileSpy.mockRejectedValue(new Error('file not found'));

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(1);
			expect(service.workspaces[0].rootOffset).toBeUndefined();
			expect(service.workspaces[0].rootUri).toBeUndefined();
		});

		test('should handle workspace files with invalid JSON', async () => {
			const mockFiles = [
				vscode.Uri.parse('file:///w/invalid.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles);
			readFileSpy.mockResolvedValue(new TextEncoder().encode('not valid json'));

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(1);
			expect(service.workspaces[0].rootOffset).toBeUndefined();
		});
	});

	describe('activeRootUri', () => {
		test('should be undefined before discovery', () => {
			expect(service.activeRootUri).toBeUndefined();
		});

		test('should be undefined when no workspace file is active', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/frontend.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({
				settings: { 'mentor.workspace.rootOffset': '.' }
			}));

			// vscode.workspace.workspaceFile is undefined (single-folder mode)
			await service.discoverWorkspaces();

			expect(service.activeRootUri).toBeUndefined();
		});

		test('should resolve when the active workspace file has a rootOffset', async () => {
			const original = vscode.workspace.workspaceFile;
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///w/frontend.code-workspace');

			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/frontend.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({
				settings: { 'mentor.workspace.rootOffset': '.' }
			}));

			await service.discoverWorkspaces();

			expect(service.activeRootUri).toBeDefined();
			expect(service.activeRootUri!.path).toBe('/w');

			(vscode.workspace as any).workspaceFile = original;
		});

		test('should be undefined when the active workspace file has no rootOffset', async () => {
			const original = vscode.workspace.workspaceFile;
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///w/frontend.code-workspace');

			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/frontend.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({
				folders: [{ path: 'ui' }]
			}));

			await service.discoverWorkspaces();

			expect(service.activeRootUri).toBeUndefined();

			(vscode.workspace as any).workspaceFile = original;
		});

		test('should be cleared on re-discovery', async () => {
			const original = vscode.workspace.workspaceFile;
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///w/frontend.code-workspace');

			findFilesSpy.mockResolvedValueOnce([
				vscode.Uri.parse('file:///w/frontend.code-workspace'),
			]);
			readFileSpy.mockResolvedValueOnce(encodeWorkspaceFile({
				settings: { 'mentor.workspace.rootOffset': '.' }
			}));

			await service.discoverWorkspaces();

			expect(service.activeRootUri).toBeDefined();

			(vscode.workspace as any).workspaceFile = undefined;
			findFilesSpy.mockResolvedValueOnce([]);

			await service.discoverWorkspaces();

			expect(service.activeRootUri).toBeUndefined();

			(vscode.workspace as any).workspaceFile = original;
		});
	});

	describe('getWorkspaceById', () => {
		test('should return the descriptor for a valid ID', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/my-workspace.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({ folders: [] }));

			await service.discoverWorkspaces();

			const descriptor = service.getWorkspaceById('my-workspace');

			expect(descriptor).toBeDefined();
			expect(descriptor!.id).toBe('my-workspace');
			expect(descriptor!.relativePath).toBe('my-workspace.code-workspace');
		});

		test('should return undefined for an unknown ID', async () => {
			findFilesSpy.mockResolvedValue([
				vscode.Uri.parse('file:///w/my-workspace.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({ folders: [] }));

			await service.discoverWorkspaces();

			expect(service.getWorkspaceById('unknown')).toBeUndefined();
		});

		test('should return undefined before discovery has been called', () => {
			expect(service.getWorkspaceById('anything')).toBeUndefined();
		});

		test('should return undefined after re-discovery clears previous results', async () => {
			findFilesSpy.mockResolvedValueOnce([
				vscode.Uri.parse('file:///w/old.code-workspace'),
			]);
			readFileSpy.mockResolvedValue(encodeWorkspaceFile({ folders: [] }));

			await service.discoverWorkspaces();

			expect(service.getWorkspaceById('old')).toBeDefined();

			findFilesSpy.mockResolvedValueOnce([]);

			await service.discoverWorkspaces();

			expect(service.getWorkspaceById('old')).toBeUndefined();
		});
	});
});
