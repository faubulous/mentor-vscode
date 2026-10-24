import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRangeIndex } from '@src/utilities/mocks/factories';
import { RangeIndex } from '@src/services/document/range-index';
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
