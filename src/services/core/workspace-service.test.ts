import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';
import { WorkspaceService } from './workspace-service';

describe('WorkspaceService', () => {
	let service: WorkspaceService;
	let findFilesSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		service = new WorkspaceService();
		findFilesSpy = vi.spyOn(vscode.workspace, 'findFiles');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('createDescriptor', () => {
		describe('Linux paths', () => {
			const rootUri = URI.parse('file:///home/user/project');

			test('should extract ID from workspace filename', () => {
				const fileUri = URI.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('my-workspace');
			});

			test('should compute relative path for a file at the project root', () => {
				const fileUri = URI.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});

			test('should compute relative path for a nested file', () => {
				const fileUri = URI.parse('file:///home/user/project/sub/dir/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.relativePath).toBe('sub/dir/my-workspace.code-workspace');
			});

			test('should set absolutePath to the fsPath of the URI', () => {
				const fileUri = URI.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.absolutePath).toBe('/home/user/project/my-workspace.code-workspace');
			});

			test('should preserve the original URI', () => {
				const fileUri = URI.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.uri).toBe(fileUri);
			});

			test('should handle deeply nested workspace files', () => {
				const fileUri = URI.parse('file:///home/user/project/a/b/c/d/test.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('test');
				expect(descriptor.relativePath).toBe('a/b/c/d/test.code-workspace');
			});

			test('should handle workspace root with trailing slash', () => {
				const rootWithSlash = URI.parse('file:///home/user/project/');
				const fileUri = URI.parse('file:///home/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootWithSlash);

				expect(descriptor.id).toBe('my-workspace');
				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});
		});

		describe('Windows paths', () => {
			const rootUri = URI.parse('file:///c:/Users/user/project');

			test('should extract ID from workspace filename', () => {
				const fileUri = URI.parse('file:///c:/Users/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('my-workspace');
			});

			test('should compute relative path with forward slashes', () => {
				const fileUri = URI.parse('file:///c:/Users/user/project/sub/dir/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.relativePath).toBe('sub/dir/my-workspace.code-workspace');
			});

			test('should set absolutePath to the fsPath of the URI', () => {
				const fileUri = URI.parse('file:///c:/Users/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.absolutePath).toBe(fileUri.fsPath);
			});

			test('should handle workspace files at the project root', () => {
				const fileUri = URI.parse('file:///c:/Users/user/project/test.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('test');
				expect(descriptor.relativePath).toBe('test.code-workspace');
			});

			test('should handle uppercase drive letters', () => {
				const root = URI.parse('file:///C:/Users/user/project');
				const fileUri = URI.parse('file:///C:/Users/user/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, root);

				expect(descriptor.id).toBe('my-workspace');
				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});

			test('should handle deeply nested workspace files', () => {
				const fileUri = URI.parse('file:///c:/Users/user/project/a/b/c/test.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('test');
				expect(descriptor.relativePath).toBe('a/b/c/test.code-workspace');
			});
		});

		describe('UNC paths', () => {
			test('should handle UNC network paths', () => {
				const rootUri = URI.parse('file://server/share/project');
				const fileUri = URI.parse('file://server/share/project/my-workspace.code-workspace');
				const descriptor = WorkspaceService.createDescriptor(fileUri, rootUri);

				expect(descriptor.id).toBe('my-workspace');
				expect(descriptor.relativePath).toBe('my-workspace.code-workspace');
			});
		});
	});

	describe('discoverWorkspaces', () => {
		test('should discover workspace files and populate the list', async () => {
			const mockFiles = [
				URI.parse('file:///w/my-workspace.code-workspace'),
				URI.parse('file:///w/other.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles as any);

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
				URI.parse('file:///w/first.code-workspace'),
			] as any);

			await service.discoverWorkspaces();

			expect(service.workspaces).toHaveLength(1);
			expect(service.workspaces[0].id).toBe('first');

			findFilesSpy.mockResolvedValueOnce([
				URI.parse('file:///w/second.code-workspace'),
			] as any);

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
				URI.parse('file:///w/sub/dir/test.code-workspace'),
			];
			findFilesSpy.mockResolvedValue(mockFiles as any);

			await service.discoverWorkspaces();

			expect(service.workspaces[0].relativePath).toBe('sub/dir/test.code-workspace');
		});
	});

	describe('getWorkspaceById', () => {
		test('should return the descriptor for a valid ID', async () => {
			findFilesSpy.mockResolvedValue([
				URI.parse('file:///w/my-workspace.code-workspace'),
			] as any);

			await service.discoverWorkspaces();

			const descriptor = service.getWorkspaceById('my-workspace');

			expect(descriptor).toBeDefined();
			expect(descriptor!.id).toBe('my-workspace');
			expect(descriptor!.relativePath).toBe('my-workspace.code-workspace');
		});

		test('should return undefined for an unknown ID', async () => {
			findFilesSpy.mockResolvedValue([
				URI.parse('file:///w/my-workspace.code-workspace'),
			] as any);

			await service.discoverWorkspaces();

			expect(service.getWorkspaceById('unknown')).toBeUndefined();
		});

		test('should return undefined before discovery has been called', () => {
			expect(service.getWorkspaceById('anything')).toBeUndefined();
		});

		test('should return undefined after re-discovery clears previous results', async () => {
			findFilesSpy.mockResolvedValueOnce([
				URI.parse('file:///w/old.code-workspace'),
			] as any);

			await service.discoverWorkspaces();

			expect(service.getWorkspaceById('old')).toBeDefined();

			findFilesSpy.mockResolvedValueOnce([]);

			await service.discoverWorkspaces();

			expect(service.getWorkspaceById('old')).toBeUndefined();
		});
	});
});
