import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockOnDidChangeFiles, mockWaitForDiscovery, mockGetFolderContents } = vi.hoisted(() => ({
	mockOnDidChangeFiles: vi.fn((_cb: any) => ({ dispose: vi.fn() })),
	mockWaitForDiscovery: vi.fn(async () => {}),
	mockGetFolderContents: vi.fn(async () => [] as any[]),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'WorkspaceFileService') return {
				onDidChangeFiles: mockOnDidChangeFiles,
				waitForDiscovery: mockWaitForDiscovery,
				getFolderContents: mockGetFolderContents,
			};
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { WorkspaceNodeProvider } from './workspace-node-provider';

beforeEach(() => {
	vi.clearAllMocks();
	// Default: workspace configured with name
	(vscode.workspace as any).name = 'test-workspace';
	(vscode.workspace as any).workspaceFolders = [
		{ name: 'root', index: 0, uri: vscode.Uri.parse('file:///workspace') }
	];
	(vscode.workspace as any).workspaceFile = undefined;
});

afterEach(() => {
	(vscode.workspace as any).name = undefined;
	(vscode.workspace as any).workspaceFolders = [];
	(vscode.workspace as any).workspaceFile = undefined;
});

describe('WorkspaceNodeProvider', () => {
	describe('constructor', () => {
		it('should subscribe to file change events without throwing', () => {
			expect(() => new WorkspaceNodeProvider()).not.toThrow();
			expect(mockOnDidChangeFiles).toHaveBeenCalled();
		});
	});

	describe('getParent', () => {
		it('should return parent directory URI string for a file URI', () => {
			const provider = new WorkspaceNodeProvider();
			const fileUri = 'file:///workspace/folder/file.ttl';
			const parent = provider.getParent(fileUri);
			expect(parent).toBe('file:///workspace/folder');
		});

		it('should return workspace root for a file directly in workspace', () => {
			const provider = new WorkspaceNodeProvider();
			const fileUri = 'file:///workspace/file.ttl';
			const parent = provider.getParent(fileUri);
			expect(parent).toBe('file:///workspace');
		});

		it('should return undefined for empty URI', () => {
			const provider = new WorkspaceNodeProvider();
			const parent = provider.getParent('');
			expect(parent).toBeUndefined();
		});
	});

	describe('getTreeItem', () => {
		it('should create a TreeItem for a file URI', () => {
			const provider = new WorkspaceNodeProvider();
			const uri = 'file:///workspace/data.ttl';
			const item = provider.getTreeItem(uri);
			expect(item).toHaveProperty('label', 'data.ttl');
			expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
			expect(item.command).toBeDefined();
		});

		it('should create a collapsible TreeItem for a directory URI', () => {
			const provider = new WorkspaceNodeProvider();
			const uri = 'file:///workspace/subfolder';
			const item = provider.getTreeItem(uri);
			expect(item).toHaveProperty('label', 'subfolder');
			expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
			expect(item.command).toBeUndefined();
		});
	});

	describe('getChildren', () => {
		it('should return empty array when no workspace is open', async () => {
			const provider = new WorkspaceNodeProvider();
			(vscode.workspace as any).name = undefined;
			(vscode.workspace as any).workspaceFolders = [];

			const children = await provider.getChildren(undefined);
			expect(children).toEqual([]);
		});

		it('should return empty array when workspaceFolders is empty', async () => {
			const provider = new WorkspaceNodeProvider();
			(vscode.workspace as any).workspaceFolders = [];

			const children = await provider.getChildren(undefined);
			expect(children).toEqual([]);
		});

		it('should call getFolderContents for root folder when no workspaceFile', async () => {
			const fakeUri = vscode.Uri.parse('file:///workspace/data.ttl');
			mockGetFolderContents.mockResolvedValueOnce([fakeUri]);

			const provider = new WorkspaceNodeProvider();
			const children = await provider.getChildren(undefined);

			expect(mockGetFolderContents).toHaveBeenCalled();
			expect(children).toContain('file:///workspace/data.ttl');
		});

		it('should call getFolderContents for specified URI when provided', async () => {
			const fakeUri = vscode.Uri.parse('file:///workspace/sub/a.ttl');
			mockGetFolderContents.mockResolvedValueOnce([fakeUri]);

			const provider = new WorkspaceNodeProvider();
			const children = await provider.getChildren('file:///workspace/sub');

			expect(mockGetFolderContents).toHaveBeenCalled();
			expect(children).toContain('file:///workspace/sub/a.ttl');
		});

		it('should iterate workspace folders when workspaceFile is set', async () => {
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///workspace/work.code-workspace');
			(vscode.workspace as any).workspaceFolders = [
				{ name: 'root', index: 0, uri: vscode.Uri.parse('file:///workspace') }
			];
			const fakeUri = vscode.Uri.parse('file:///workspace/data.ttl');
			mockGetFolderContents.mockResolvedValueOnce([fakeUri]);

			const provider = new WorkspaceNodeProvider();
			const children = await provider.getChildren(undefined);

			expect(children).toContain('file:///workspace');
		});

		it('should omit workspace folders with no contents when workspaceFile is set', async () => {
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///workspace/work.code-workspace');
			(vscode.workspace as any).workspaceFolders = [
				{ name: 'root', index: 0, uri: vscode.Uri.parse('file:///workspace') }
			];
			mockGetFolderContents.mockResolvedValueOnce([]);

			const provider = new WorkspaceNodeProvider();
			const children = await provider.getChildren(undefined);

			expect(children).toEqual([]);
		});
	});

	describe('refresh', () => {
		it('should fire the change event without throwing', () => {
			const provider = new WorkspaceNodeProvider();
			expect(() => provider.refresh()).not.toThrow();
		});
	});
});
