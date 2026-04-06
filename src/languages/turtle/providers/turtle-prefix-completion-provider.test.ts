import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockGetDocumentContext, mockGetUriForPrefix } = vi.hoisted(() => ({
    mockGetDocumentContext: vi.fn(),
    mockGetUriForPrefix: vi.fn(),
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'DocumentContextService') return { getDocumentContext: mockGetDocumentContext };
            if (token === 'PrefixLookupService') return { getUriForPrefix: mockGetUriForPrefix };
            return {};
        }),
    },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

vi.mock('@src/services/tokens', () => ({
    ServiceToken: {
        DocumentContextService: 'DocumentContextService',
        PrefixLookupService: 'PrefixLookupService',
    },
}));

import { TurtlePrefixCompletionProvider } from './turtle-prefix-completion-provider';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

const mockDocument = {
    getText: () => '',
    uri: vscode.Uri.parse('file:///test.ttl'),
} as any;

const mockPosition = new vscode.Position(0, 0);

beforeEach(() => {
    mockGetDocumentContext.mockReset();
    mockGetUriForPrefix.mockReset();
});

describe('TurtlePrefixCompletionProvider', () => {
    it('stores the onComplete callback', () => {
        const cb = (uri: string) => ` <${uri}>`;
        const provider = new TurtlePrefixCompletionProvider(cb);
        expect(provider.onComplete).toBe(cb);
    });

    it('onComplete produces the expected string', () => {
        const provider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}> .`);
        expect(provider.onComplete('http://example.org/')).toBe(' <http://example.org/> .');
    });

    it('prefixTokenTypes contains the PREFIX token name', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        expect(types.has(RdfToken.PREFIX.name)).toBe(true);
    });

    it('prefixTokenTypes contains the TTL_PREFIX token name', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        expect(types.has(RdfToken.TTL_PREFIX.name)).toBe(true);
    });

    it('prefixTokenTypes contains exactly two entries', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        expect(types.size).toBe(2);
    });

    it('does not add extra token types beyond PREFIX and TTL_PREFIX', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        const expected = new Set([RdfToken.PREFIX.name, RdfToken.TTL_PREFIX.name]);
        expect(types).toEqual(expected);
    });

    describe('provideInlineCompletionItems', () => {
        it('returns null when no document context', () => {
            mockGetDocumentContext.mockReturnValue(null);
            const provider = new TurtlePrefixCompletionProvider(() => '');
            const result = provider.provideInlineCompletionItems(mockDocument, mockPosition, {} as any);
            expect(result).toBeNull();
        });

        it('returns null when token index is less than 1', () => {
            mockGetDocumentContext.mockReturnValue({
                getTokenIndexAtPosition: vi.fn(() => 0),
                tokens: [{ tokenType: { name: 'SomeToken' }, image: 'ex:' }],
            });
            const provider = new TurtlePrefixCompletionProvider(() => '');
            const result = provider.provideInlineCompletionItems(mockDocument, mockPosition, {} as any);
            expect(result).toBeNull();
        });

        it('returns undefined when current token type is not PNAME_NS', () => {
            mockGetDocumentContext.mockReturnValue({
                getTokenIndexAtPosition: vi.fn(() => 1),
                tokens: [
                    { tokenType: { name: RdfToken.PREFIX.name }, image: '@prefix' },
                    { tokenType: { name: 'SomeOtherToken' }, image: 'foo' },
                ],
            });
            const provider = new TurtlePrefixCompletionProvider(() => '');
            const result = provider.provideInlineCompletionItems(mockDocument, mockPosition, {} as any);
            expect(result).toBeUndefined();
        });

        it('returns null when previous token type is not a prefix keyword', () => {
            mockGetDocumentContext.mockReturnValue({
                getTokenIndexAtPosition: vi.fn(() => 1),
                tokens: [
                    { tokenType: { name: 'DOT' }, image: '.' },
                    { tokenType: { name: RdfToken.PNAME_NS.name }, image: 'ex:' },
                ],
            });
            const provider = new TurtlePrefixCompletionProvider(() => '');
            const result = provider.provideInlineCompletionItems(mockDocument, mockPosition, {} as any);
            expect(result).toBeNull();
        });

        it('returns completion item when prefix is found in lookup', () => {
            mockGetDocumentContext.mockReturnValue({
                getTokenIndexAtPosition: vi.fn(() => 1),
                tokens: [
                    { tokenType: { name: RdfToken.PREFIX.name }, image: '@prefix' },
                    { tokenType: { name: RdfToken.PNAME_NS.name }, image: 'ex:' },
                ],
            });
            mockGetUriForPrefix.mockReturnValue('http://example.org/');
            const provider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}>`);
            const result = provider.provideInlineCompletionItems(mockDocument, mockPosition, {} as any) as any[];
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
            expect(result[0].insertText).toBe(' <http://example.org/>');
        });

        it('returns empty array when prefix is not in lookup', () => {
            mockGetDocumentContext.mockReturnValue({
                getTokenIndexAtPosition: vi.fn(() => 1),
                tokens: [
                    { tokenType: { name: RdfToken.TTL_PREFIX.name }, image: '@prefix' },
                    { tokenType: { name: RdfToken.PNAME_NS.name }, image: 'unknown:' },
                ],
            });
            mockGetUriForPrefix.mockReturnValue(undefined);
            const provider = new TurtlePrefixCompletionProvider(() => '');
            const result = provider.provideInlineCompletionItems(mockDocument, mockPosition, {} as any);
            expect(result).toEqual([]);
        });
    });
});
