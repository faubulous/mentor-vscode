import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRangeIndex } from '@src/utilities/mocks/factories';
import { RangeIndex } from '@src/utilities/range-index';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const mockContextService = {
    contexts: {} as Record<string, any>,
};

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === ServiceToken.DocumentContextService) return mockContextService;
            return {};
        }),
    },
    injectable: () => (t: any) => t,
    inject: () => () => {},
    singleton: () => (t: any) => t,
}));

import { ResourceDefinitionProvider } from '@src/providers/resource-definition-provider';
import { ServiceToken } from '@src/services/tokens';

describe('ResourceDefinitionProvider', () => {
    const docUri = vscode.Uri.parse('file:///test.ttl');
    const docUriStr = docUri.toString();
    const pos = new vscode.Position(0, 5);
    let provider: ResourceDefinitionProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContextService.contexts = {};
        provider = new ResourceDefinitionProvider(mockContextService as any);
    });

    describe('provideDefinition', () => {
        it('returns null when no context exists for the document', () => {
            const doc = { uri: docUri } as any;
            expect(provider.provideDefinition(doc, pos)).toBeNull();
        });

        it('returns null when context has no IRI at position', () => {
            mockContextService.contexts[docUriStr] = {
                uri: docUri,
                getIriAtPosition: vi.fn(() => null),
                typeDefinitions: new RangeIndex(),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            const doc = { uri: docUri } as any;
            expect(provider.provideDefinition(doc, pos)).toBeNull();
        });

        it('delegates to provideDefinitionForResource when IRI is found', () => {
            const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 20 } };
            mockContextService.contexts[docUriStr] = {
                uri: docUri,
                getIriAtPosition: vi.fn(() => 'http://example.org/Thing'),
                typeDefinitions: createRangeIndex({ 'http://example.org/Thing': [range] }),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            const doc = { uri: docUri } as any;
            const result = provider.provideDefinition(doc, pos);
            expect(result).toBeInstanceOf(vscode.Location);
        });
    });

    describe('provideDefinition during workspace indexing', () => {
        const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 20 } };
        const iri = 'http://example.org/Thing';

        /**
         * Creates a context with the given type definitions.
         */
        function makeContext(uri: vscode.Uri, typeDefinitions: RangeIndex) {
            return {
                uri,
                getIriAtPosition: vi.fn(() => iri),
                typeDefinitions,
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: createRangeIndex({ [iri]: [range] }),
            };
        }

        it('waits for the index when no loaded file defines the resource', async () => {
            let finishIndexing!: () => void;

            const indexer = {
                indexingFinished: false,
                waitForIndexed: vi.fn(() => new Promise<void>(resolve => finishIndexing = resolve)),
            };

            mockContextService.contexts[docUriStr] = makeContext(docUri, new RangeIndex());

            const result = new ResourceDefinitionProvider(mockContextService as any, indexer).provideDefinition({ uri: docUri } as any, pos) as Promise<vscode.Location>;

            // The defining file is indexed after the request.
            const definingUri = vscode.Uri.parse('file:///ontology.ttl');

            mockContextService.contexts[definingUri.toString()] = makeContext(definingUri, createRangeIndex({ [iri]: [range] }));
            finishIndexing();

            expect((await result).uri.toString()).toBe(definingUri.toString());
        });

        it('answers right away when a loaded file defines the resource', () => {
            const indexer = { indexingFinished: false, waitForIndexed: vi.fn() };

            mockContextService.contexts[docUriStr] = makeContext(docUri, createRangeIndex({ [iri]: [range] }));

            const result = new ResourceDefinitionProvider(mockContextService as any, indexer).provideDefinition({ uri: docUri } as any, pos);

            expect(result).toBeInstanceOf(vscode.Location);
            expect(indexer.waitForIndexed).not.toHaveBeenCalled();
        });

        it('answers right away when the workspace is indexed', () => {
            const indexer = { indexingFinished: true, waitForIndexed: vi.fn() };

            mockContextService.contexts[docUriStr] = makeContext(docUri, new RangeIndex());

            const result = new ResourceDefinitionProvider(mockContextService as any, indexer).provideDefinition({ uri: docUri } as any, pos);

            expect((result as vscode.Location).uri.toString()).toBe(docUriStr);
            expect(indexer.waitForIndexed).not.toHaveBeenCalled();
        });
    });

    describe('provideDefinition with preset graphs', () => {
        const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 20 } };
        const iri = 'http://www.w3.org/2000/01/rdf-schema#label';
        const presetUri = vscode.Uri.parse('mentor-vfs:/vocabularies/rdfs.ttl');
        const workspaceUri = vscode.Uri.parse('file:///ontology.ttl');

        /**
         * Creates a context that defines the resource through the given range indexes.
         */
        function makeContext(uri: vscode.Uri, options: { typeDefinitions?: RangeIndex, subjects?: RangeIndex, isPreset?: boolean } = {}) {
            return {
                uri,
                isPreset: options.isPreset ?? false,
                getIriAtPosition: vi.fn(() => iri),
                typeDefinitions: options.typeDefinitions ?? new RangeIndex(),
                typeAssertions: new RangeIndex(),
                subjects: options.subjects ?? new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: createRangeIndex({ [iri]: [range] }),
            };
        }

        /**
         * Creates a preset document service whose load adds the given context.
         */
        function makePresetDocuments(context?: ReturnType<typeof makeContext>) {
            return {
                ensureLoaded: vi.fn(async () => {
                    if (context) {
                        mockContextService.contexts[context.uri.toString()] = context;
                    }
                }),
            };
        }

        it('loads the preset documents when no loaded context defines the resource', async () => {
            const presetDocuments = makePresetDocuments(makeContext(presetUri, { typeDefinitions: createRangeIndex({ [iri]: [range] }), isPreset: true }));

            mockContextService.contexts[docUriStr] = makeContext(docUri);

            const result = await new ResourceDefinitionProvider(mockContextService as any, undefined, presetDocuments).provideDefinition({ uri: docUri } as any, pos) as vscode.Location;

            expect(presetDocuments.ensureLoaded).toHaveBeenCalledTimes(1);
            expect(result.uri.toString()).toBe(presetUri.toString());
        });

        it('does not load the preset documents when a workspace context defines the resource', () => {
            const presetDocuments = makePresetDocuments();

            mockContextService.contexts[docUriStr] = makeContext(docUri);
            mockContextService.contexts[workspaceUri.toString()] = makeContext(workspaceUri, { typeDefinitions: createRangeIndex({ [iri]: [range] }) });

            const result = new ResourceDefinitionProvider(mockContextService as any, undefined, presetDocuments).provideDefinition({ uri: docUri } as any, pos);

            expect(presetDocuments.ensureLoaded).not.toHaveBeenCalled();
            expect((result as vscode.Location).uri.toString()).toBe(workspaceUri.toString());
        });

        it('prefers a workspace definition over a preset definition', () => {
            const primaryContext = makeContext(docUri);

            // The preset context is registered first, so that only the precedence decides.
            mockContextService.contexts[presetUri.toString()] = makeContext(presetUri, { typeDefinitions: createRangeIndex({ [iri]: [range] }), isPreset: true });
            mockContextService.contexts[workspaceUri.toString()] = makeContext(workspaceUri, { typeDefinitions: createRangeIndex({ [iri]: [range] }) });

            const result = provider.provideDefinitionForResource(primaryContext as any, iri);

            expect((result as vscode.Location).uri.toString()).toBe(workspaceUri.toString());
        });

        it('accepts a subject as a definition in a preset context', () => {
            const primaryContext = makeContext(docUri);

            mockContextService.contexts[presetUri.toString()] = makeContext(presetUri, { subjects: createRangeIndex({ [iri]: [range] }), isPreset: true });

            const result = provider.provideDefinitionForResource(primaryContext as any, iri);

            expect((result as vscode.Location).uri.toString()).toBe(presetUri.toString());
        });

        it('does not accept a subject as a definition in a workspace context', () => {
            const primaryContext = makeContext(docUri);

            mockContextService.contexts[workspaceUri.toString()] = makeContext(workspaceUri, { subjects: createRangeIndex({ [iri]: [range] }) });

            const result = provider.provideDefinitionForResource(primaryContext as any, iri);

            expect((result as vscode.Location).uri.toString()).toBe(docUriStr);
        });

        it('falls back to the reference in the document when no preset graph defines the resource', async () => {
            const presetDocuments = makePresetDocuments();

            mockContextService.contexts[docUriStr] = makeContext(docUri);

            const result = await new ResourceDefinitionProvider(mockContextService as any, undefined, presetDocuments).provideDefinition({ uri: docUri } as any, pos) as vscode.Location;

            expect(presetDocuments.ensureLoaded).toHaveBeenCalledTimes(1);
            expect(result.uri.toString()).toBe(docUriStr);
        });
    });

    describe('provideDefinitionForResource', () => {
        it('returns null when IRI has no definition, assertion, namespace, or reference', () => {
            const ctx = {
                uri: docUri,
                typeDefinitions: new RangeIndex(),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            expect(provider.provideDefinitionForResource(ctx as any, 'http://example.org/Unknown')).toBeNull();
        });

        it('returns a Location from typeDefinitions in the primary context', () => {
            const range = { start: { line: 3, character: 0 }, end: { line: 3, character: 30 } };
            const ctx = {
                uri: docUri,
                typeDefinitions: createRangeIndex({ 'http://example.org/Thing': [range] }),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            const result = provider.provideDefinitionForResource(ctx as any, 'http://example.org/Thing');
            expect(result).toBeInstanceOf(vscode.Location);
        });

        it('returns a Location from typeAssertions when typeDefinitions is absent', () => {
            const range = { start: { line: 5, character: 0 }, end: { line: 5, character: 20 } };
            const ctx = {
                uri: docUri,
                typeDefinitions: new RangeIndex(),
                typeAssertions: createRangeIndex({ 'http://example.org/Thing': [range] }),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            const result = provider.provideDefinitionForResource(ctx as any, 'http://example.org/Thing');
            expect(result).toBeInstanceOf(vscode.Location);
        });

        it('returns a Location from namespaceDefinitions when type info is absent', () => {
            const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 30 } };
            const ctx = {
                uri: docUri,
                typeDefinitions: new RangeIndex(),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: createRangeIndex({ 'http://example.org/': [range] }),
                references: new RangeIndex(),
            };
            const result = provider.provideDefinitionForResource(ctx as any, 'http://example.org/');
            expect(result).toBeInstanceOf(vscode.Location);
        });

        it('returns a Location from references as last resort', () => {
            const range = { start: { line: 2, character: 0 }, end: { line: 2, character: 25 } };
            const ctx = {
                uri: docUri,
                typeDefinitions: new RangeIndex(),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: createRangeIndex({ 'http://example.org/Thing': [range] }),
            };
            const result = provider.provideDefinitionForResource(ctx as any, 'http://example.org/Thing');
            expect(result).toBeInstanceOf(vscode.Location);
        });

        it('uses typeDefinition from a secondary context when primaryContextOnly=false', () => {
            const docUri2 = vscode.Uri.parse('file:///other.ttl');
            const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 20 } };
            // primary context has no definition; secondary context does
            const primaryCtx = {
                uri: docUri,
                typeDefinitions: new RangeIndex(),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            mockContextService.contexts[docUri2.toString()] = {
                uri: docUri2,
                typeDefinitions: createRangeIndex({ 'http://example.org/Widget': [range] }),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            const result = provider.provideDefinitionForResource(primaryCtx as any, 'http://example.org/Widget', false);
            expect(result).toBeInstanceOf(vscode.Location);
        });

        it('ignores secondary contexts when primaryContextOnly=true', () => {
            const docUri2 = vscode.Uri.parse('file:///other.ttl');
            const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 20 } };
            const primaryCtx = {
                uri: docUri,
                typeDefinitions: new RangeIndex(),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            mockContextService.contexts[docUri2.toString()] = {
                uri: docUri2,
                typeDefinitions: createRangeIndex({ 'http://example.org/Widget': [range] }),
            };
            const result = provider.provideDefinitionForResource(primaryCtx as any, 'http://example.org/Widget', true);
            expect(result).toBeNull();
        });

        it('prefers the primary context when it is also in the context list', () => {
            const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 20 } };
            const primaryCtx = {
                uri: docUri,
                typeDefinitions: createRangeIndex({ 'http://example.org/Thing': [range] }),
                typeAssertions: new RangeIndex(),
                namespaceDefinitions: new RangeIndex(),
                references: new RangeIndex(),
            };
            // Also register the primary context in the context service
            mockContextService.contexts[docUriStr] = primaryCtx;
            const result = provider.provideDefinitionForResource(primaryCtx as any, 'http://example.org/Thing');
            expect(result).toBeInstanceOf(vscode.Location);
        });
    });
});
