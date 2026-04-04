import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position } from '@src/utilities/mocks/vscode';
import { TurtleCompletionItemProvider } from './turtle-completion-item-provider';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { RdfSyntax, RdfToken } from '@faubulous/mentor-rdf-parsers';

function makeDoc(uri = 'file:///test.ttl'): TurtleDocument {
    return new TurtleDocument(Uri.parse(uri) as any, RdfSyntax.Turtle);
}

function makeToken(name: string, image: string, opts: {
    startLine?: number; startColumn?: number;
    endLine?: number; endColumn?: number;
} = {}) {
    return {
        tokenType: { name },
        image,
        startLine: opts.startLine ?? 1,
        startColumn: opts.startColumn ?? 1,
        endLine: opts.endLine ?? 1,
        endColumn: opts.endColumn ?? (opts.startColumn ?? 1) + image.length - 1,
    };
}

function makeProvider(): TurtleCompletionItemProvider {
    const provider = new TurtleCompletionItemProvider();

    // Stub the DI-backed services
    vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
        getDocumentContext: () => null,
        getDocumentContextFromUri: () => null,
        contexts: {},
    });
    vi.spyOn(provider as any, 'vocabulary', 'get').mockReturnValue({
        getProperties: () => [],
        getClasses: () => [],
    });

    return provider;
}

describe('TurtleCompletionItemProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleCompletionItemProvider()).not.toThrow();
        });
    });

    describe('maxCompletionItems', () => {
        it('is a positive integer', () => {
            const provider = makeProvider();
            expect(provider.maxCompletionItems).toBeGreaterThan(0);
        });
    });

    describe('provideCompletionItems', () => {
        it('returns null when context is not available for the document', () => {
            const provider = makeProvider();
            const doc = { uri: Uri.parse('file:///test.ttl'), languageId: 'turtle' };
            const result = provider.provideCompletionItems(doc as any, new Position(0, 5) as any, {} as any, {} as any);
            expect(result).toBeNull();
        });
    });

    describe('resolveCompletionItem', () => {
        it('returns the item unchanged', () => {
            const provider = makeProvider();
            const item = { label: 'ex:Thing', kind: 5 };
            const result = provider.resolveCompletionItem!(item as any, {} as any);
            expect(result).toBe(item);
        });
    });

    describe('getCompletionItems via context', () => {
        it('returns an empty array when the current token is not a PNAME_LN or PNAME_NS', () => {
            const provider = makeProvider();
            const context = makeDoc();
            const tokens = [
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, startColumn: 1, endColumn: 21 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 23, endColumn: 23 }),
            ];
            context.setTokens(tokens as any);

            // Context service returns our context
            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => context,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            // Token at position (line 0, char 0) is the IRIREF
            const doc = { uri: Uri.parse('file:///test.ttl') };
            const result = (provider as any).getCompletionItems(doc as any, context, 0);
            expect(result).toEqual([]);
        });

        it('returns an empty array when PNAME_LN is used but namespace is not defined', () => {
            const provider = makeProvider();
            const context = makeDoc();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Foo', { startLine: 1, startColumn: 3, endColumn: 8 }),
            ];
            context.setTokens(tokens as any);

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => context,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///test.ttl') };
            // namespaceIri for 'ex:' is undefined → should return []
            const result = (provider as any).getCompletionItems(doc as any, context, 1);
            expect(result).toEqual([]);
        });
    });
});
