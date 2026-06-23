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

const configStore = new Map<string, string>();
const inspectResult = { workspaceValue: undefined as string | undefined };
const updateSpy = vi.fn(async (key: string, value: string) => { configStore.set(key, value); });

vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: () => ({
        get: (key: string) => configStore.get(key),
        inspect: () => inspectResult,
        update: updateSpy,
    }),
}));

const decoder = new TextDecoder();

describe('TemplateFileSystemProvider', () => {
    let TemplateFileSystemProvider: any;

    beforeEach(async () => {
        mockSubscriptions.length = 0;
        configStore.clear();
        inspectResult.workspaceValue = undefined;
        updateSpy.mockClear();
        vi.resetModules();
        const mod = await import('@src/providers/template-file-system-provider');
        TemplateFileSystemProvider = mod.TemplateFileSystemProvider;
    });

    it('registers a file system provider on construction', () => {
        const provider = new TemplateFileSystemProvider();
        expect(mockSubscriptions.length).toBe(1);
        expect(provider).toBeDefined();
    });

    describe('global (config-backed) URIs', () => {
        const key = 'language.sparql.defaultDocumentTemplate';

        it('readFile returns the current setting value', () => {
            configStore.set(key, 'SELECT * WHERE { ?s ?p ?o }');
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.globalUri(key, 'sparql');

            expect(decoder.decode(provider.readFile(uri))).toBe('SELECT * WHERE { ?s ?p ?o }');
        });

        it('readFile returns empty string for an unset setting', () => {
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.globalUri(key, 'sparql');

            expect(decoder.decode(provider.readFile(uri))).toBe('');
        });

        it('writeFile updates the setting at Global scope by default', async () => {
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.globalUri(key, 'sparql');

            await provider.writeFile(uri, new TextEncoder().encode('ASK { ?s ?p ?o }'));

            expect(updateSpy).toHaveBeenCalledWith(key, 'ASK { ?s ?p ?o }', vscode.ConfigurationTarget.Global);
        });

        it('writeFile targets Workspace scope when the value lives there', async () => {
            inspectResult.workspaceValue = 'existing';
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.globalUri(key, 'sparql');

            await provider.writeFile(uri, new TextEncoder().encode('updated'));

            expect(updateSpy).toHaveBeenCalledWith(key, 'updated', vscode.ConfigurationTarget.Workspace);
        });

        it('stat reports the size of the current value', () => {
            configStore.set(key, 'abc');
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.globalUri(key, 'sparql');

            const stat = provider.stat(uri);

            expect(stat.type).toBe(vscode.FileType.File);
            expect(stat.size).toBe(3);
        });
    });

    describe('scratch (in-memory) URIs', () => {
        const token = 'listGraphs~store-1';

        it('readFile returns the seeded buffer', () => {
            TemplateFileSystemProvider.seedScratch(token, 'SELECT ?g WHERE {}');
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.scratchUri(token, 'sparql');

            expect(decoder.decode(provider.readFile(uri))).toBe('SELECT ?g WHERE {}');
        });

        it('writeFile updates the buffer and fires onDidSaveScratch', async () => {
            TemplateFileSystemProvider.seedScratch(token, 'old');
            const provider = new TemplateFileSystemProvider();
            const uri = TemplateFileSystemProvider.scratchUri(token, 'sparql');

            const saved: { token: string; content: string }[] = [];
            TemplateFileSystemProvider.onDidSaveScratch((e: { token: string; content: string }) => saved.push(e));

            await provider.writeFile(uri, new TextEncoder().encode('new query'));

            expect(decoder.decode(provider.readFile(uri))).toBe('new query');
            expect(saved).toEqual([{ token, content: 'new query' }]);
            expect(updateSpy).not.toHaveBeenCalled();
        });
    });

    describe('unsupported operations', () => {
        it('createDirectory, delete and rename throw', () => {
            const provider = new TemplateFileSystemProvider();
            expect(() => provider.createDirectory()).toThrow();
            expect(() => provider.delete()).toThrow();
            expect(() => provider.rename()).toThrow();
        });

        it('readDirectory returns an empty array and watch returns a Disposable', () => {
            const provider = new TemplateFileSystemProvider();
            expect(provider.readDirectory()).toEqual([]);
            expect(typeof provider.watch().dispose).toBe('function');
        });
    });
});
