import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

const mockSubscriptions: any[] = [];

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
            return {};
        }),
    },
    injectable: () => (t: any) => t,
    inject: () => () => {},
    singleton: () => (t: any) => t,
}));

vi.mock('@src/services/tokens', () => ({
    ServiceToken: { ExtensionContext: 'ExtensionContext' },
}));

describe('WorkspaceFileSystemProvider', () => {
    let WorkspaceFileSystemProvider: any;

    beforeEach(async () => {
        mockSubscriptions.length = 0;
        vi.resetModules();
        const mod = await import('./workspace-file-system-provider');
        WorkspaceFileSystemProvider = mod.WorkspaceFileSystemProvider;
    });

    // A workspace-scheme URI the provider accepts as input
    const workspaceUri = vscode.Uri.parse('workspace:/dir/file.ttl');

    it('registers a file system provider on construction', () => {
        const provider = new WorkspaceFileSystemProvider();
        expect(mockSubscriptions.length).toBe(1);
        expect(provider).toBeDefined();
    });

    it('exposes onDidChangeFile event', () => {
        const provider = new WorkspaceFileSystemProvider();
        expect(typeof provider.onDidChangeFile).toBe('function');
    });

    describe('stat', () => {
        it('delegates to vscode.workspace.fs.stat with the converted file URI', async () => {
            const statResult = { type: 1, ctime: 0, mtime: 0, size: 100 };
            vi.spyOn(vscode.workspace.fs as any, 'stat').mockResolvedValue(statResult);
            const provider = new WorkspaceFileSystemProvider();
            const result = await provider.stat(workspaceUri);
            expect(result).toEqual(statResult);
        });
    });

    describe('readFile', () => {
        it('delegates to vscode.workspace.fs.readFile with the converted file URI', async () => {
            const content = new Uint8Array([1, 2, 3]);
            vi.spyOn(vscode.workspace.fs as any, 'readFile').mockResolvedValue(content);
            const provider = new WorkspaceFileSystemProvider();
            const result = await provider.readFile(workspaceUri);
            expect(result).toBe(content);
        });
    });

    describe('writeFile', () => {
        it('delegates to vscode.workspace.fs.writeFile with the converted file URI', async () => {
            const writeFile = vi.spyOn(vscode.workspace.fs as any, 'writeFile').mockResolvedValue(undefined);
            const provider = new WorkspaceFileSystemProvider();
            const content = new Uint8Array([4, 5, 6]);
            await provider.writeFile(workspaceUri, content);
            expect(writeFile).toHaveBeenCalledOnce();
        });
    });

    describe('readDirectory', () => {
        it('returns an empty array', () => {
            const provider = new WorkspaceFileSystemProvider();
            expect(provider.readDirectory()).toEqual([]);
        });
    });

    describe('createDirectory', () => {
        it('throws NotSupportedError', () => {
            const provider = new WorkspaceFileSystemProvider();
            expect(() => provider.createDirectory()).toThrow('This feature is not supported.');
        });
    });

    describe('delete', () => {
        it('throws NotSupportedError', () => {
            const provider = new WorkspaceFileSystemProvider();
            expect(() => provider.delete()).toThrow('This feature is not supported.');
        });
    });

    describe('rename', () => {
        it('throws NotSupportedError', () => {
            const provider = new WorkspaceFileSystemProvider();
            expect(() => provider.rename()).toThrow('This feature is not supported.');
        });
    });

    describe('watch', () => {
        it('returns a Disposable', () => {
            const provider = new WorkspaceFileSystemProvider();
            const disposable = provider.watch(workspaceUri, { recursive: false, excludes: [] });
            expect(disposable).toBeDefined();
            expect(typeof disposable.dispose).toBe('function');
        });
    });
});
