import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({ getDocumentContext: () => null })) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position, Range } from '@src/utilities/mocks/vscode';
import { TurtleRenameProvider } from '@src/languages/turtle/providers/turtle-rename-provider';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { RdfSyntax, RdfToken } from '@faubulous/mentor-rdf-parsers';

/**
 * Build a minimal IToken.
 * Positions follow chevrotain convention: 1-based lines and columns.
 */
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

function makeDoc(uri = 'file:///test.ttl'): TurtleDocument {
    return new TurtleDocument(Uri.parse(uri) as any, RdfSyntax.Turtle);
}

/**
 * Build a context service stub whose `getDocumentContext` always returns the
 * provided document.
 */
function makeContextService(context: TurtleDocument | null) {
    return { getDocumentContext: () => context };
}

/**
 * Build a `TurtleRenameProvider` whose `contextService` getter is replaced with
 * a stub that returns the given context.
 */
function makeProvider(context: TurtleDocument | null): TurtleRenameProvider {
    const provider = new TurtleRenameProvider();
    vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue(makeContextService(context));
    return provider;
}

describe('TurtleRenameProvider', () => {
    describe('contextService getter', () => {
        it('returns the document context service via container (getter body executed)', async () => {
            // No spy on contextService: the real getter body (line 15) executes.
            // The container mock returns { getDocumentContext: () => null },
            // so prepareRename returns null without further logic.
            const provider = new TurtleRenameProvider();
            const result = await provider.prepareRename(
                { uri: Uri.parse('file:///test.ttl') } as any,
                new Position(0, 0) as any
            );
            expect(result).toBeNull();
        });
    });

    describe('prepareRename', () => {
        it('returns null when context is null', async () => {
            const provider = makeProvider(null);
            const result = await provider.prepareRename(
                { uri: Uri.parse('file:///test.ttl') } as any,
                new Position(0, 0) as any
            );
            expect(result).toBeNull();
        });

        it('throws when no token found at position', async () => {
            const context = makeDoc();
            const provider = makeProvider(context);
            await expect(
                provider.prepareRename(
                    { uri: Uri.parse('file:///test.ttl') } as any,
                    new Position(0, 0) as any
                )
            ).rejects.toThrow('No token found at the given position.');
        });

        it('returns prefix edit range when cursor is within the prefix part', async () => {
            const context = makeDoc();
            // PNAME_NS 'ex:' at line 1, col 1; colon is at index 2
            const token = makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 1, endColumn: 3 });
            context.setTokens([token] as any);
            const provider = makeProvider(context);
            // Position(0, 0) → character 0, which is before the colon → isPrefixTokenAtPosition = true
            const result = await provider.prepareRename(
                { uri: Uri.parse('file:///test.ttl') } as any,
                new Position(0, 0) as any
            );
            expect(result).not.toBeNull();
        });

        it('returns label edit range when cursor is in the local name part', async () => {
            const context = makeDoc();
            // PNAME_LN 'ex:Thing' at line 1, col 1; colon is at index 2
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startLine: 1, startColumn: 1, endColumn: 8 });
            context.setTokens([token] as any);
            const provider = makeProvider(context);
            // Position(0, 5) → character 5 > 2 (colon index) → isPrefixTokenAtPosition = false
            const result = await provider.prepareRename(
                { uri: Uri.parse('file:///test.ttl') } as any,
                new Position(0, 5) as any
            );
            expect(result).not.toBeNull();
        });
    });

    describe('provideRenameEdits', () => {
        const docUri = Uri.parse('file:///test.ttl') as any;

        it('returns an empty WorkspaceEdit when context is null', () => {
            const provider = makeProvider(null);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'newName');
            expect((edits as any).size).toBe(0);
        });

        it('returns an empty WorkspaceEdit when no token covers the position', () => {
            const context = makeDoc();
            // No tokens set — getTokenAtPosition returns undefined
            const provider = makeProvider(context);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect((edits as any).size).toBe(0);
        });

        it('produces replace edits for all occurrences of a renamed prefix', () => {
            const context = makeDoc();
            // Two tokens that share the prefix "ex"
            const t1 = makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 1, endColumn: 3 });
            const t2 = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startLine: 2, startColumn: 1, endColumn: 8 });
            context.setTokens([t1, t2] as any);

            const provider = makeProvider(context);
            // Position on the prefix of t1: character 0 is 'e' of 'ex:'
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'ns');
            // Two tokens with prefix "ex" → two replace edits
            expect((edits as any).size).toBe(2);
        });

        it('produces replace edits for all occurrences of a renamed variable', () => {
            const context = makeDoc();
            const varToken = makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 1, endColumn: 2 });
            const varToken2 = makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 10, endColumn: 11 });
            context.setTokens([varToken, varToken2] as any);

            const provider = makeProvider(context);
            // Cursor on the first ?x
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 1) as any, '?y');
            expect((edits as any).size).toBe(2);
        });

        it('produces one edit for an IRI token that appears once in references', () => {
            const context = makeDoc();
            // An IRIREF token at column 1 — setTokens registers it as a subject/reference
            const token = makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', {
                startLine: 1, startColumn: 1, endColumn: 25
            });
            context.setTokens([token] as any);

            const provider = makeProvider(context);
            // The reference is registered, so we expect exactly one rename edit
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect((edits as any).size).toBe(1);
        });

        it('returns empty edits when token is not prefix/variable and getIriFromToken returns null', () => {
            const context = makeDoc();
            // A period token: not a prefix token, not a variable → else branch; getIriFromToken → null
            const token = makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 });
            context.setTokens([token] as any);

            const provider = makeProvider(context);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'newName');
            expect((edits as any).size).toBe(0);
        });

        it('returns empty edits when IRI has no registered references', () => {
            const context = makeDoc();
            const token = makeToken(RdfToken.IRIREF.name, '<http://example.org/NoRef>', {
                startLine: 1, startColumn: 1, endColumn: 24
            });
            context.setTokens([token] as any);
            // Clear references so the IRI has no entries
            (context as any).references = {};

            const provider = makeProvider(context);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect((edits as any).size).toBe(0);
        });

        it('skips prefix token when getPrefixEditRange returns null', () => {
            // Cover line 67: `if (!r) continue` in the PNAME_NS/PNAME_LN case
            const context = makeDoc();
            const prefixToken = makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 1, endColumn: 3 });
            context.setTokens([prefixToken] as any);

            const provider = makeProvider(context);
            vi.spyOn(provider as any, 'getPrefixEditRange').mockReturnValue(null);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'ns');
            expect((edits as any).size).toBe(0);
        });

        it('skips variable token when getLabelEditRange returns null', () => {
            // Cover line 84: `if (!r) continue` in the variable branch
            const context = makeDoc();
            const varToken = makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 1, endColumn: 2 });
            context.setTokens([varToken] as any);

            const provider = makeProvider(context);
            vi.spyOn(provider as any, 'getLabelEditRange').mockReturnValue(null);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 1) as any, '?y');
            expect((edits as any).size).toBe(0);
        });

        it('skips reference when getTokenAtPosition returns null', () => {
            // Cover line 100: `if (!token) continue` in the IRI reference branch
            const context = makeDoc();
            const iriToken = makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', {
                startLine: 1, startColumn: 1, endColumn: 25
            });
            context.setTokens([iriToken] as any);

            const provider = makeProvider(context);
            // First call (cursor lookup) returns the IRI token; subsequent calls (reference loop) return null
            vi.spyOn(context, 'getTokenAtPosition')
                .mockReturnValueOnce(iriToken as any)
                .mockReturnValue(null as any);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect((edits as any).size).toBe(0);
        });

        it('skips reference when getLabelEditRange returns null for reference token', () => {
            // Cover line 104: `if (!editRange) continue`
            const context = makeDoc();
            const iriToken = makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', {
                startLine: 1, startColumn: 1, endColumn: 25
            });
            context.setTokens([iriToken] as any);

            const provider = makeProvider(context);
            // getTokenAtPosition returns a token, but getLabelEditRange returns null
            vi.spyOn(context, 'getTokenAtPosition').mockReturnValue(iriToken as any);
            vi.spyOn(provider as any, 'getLabelEditRange').mockReturnValue(null);
            const edits = provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect((edits as any).size).toBe(0);
        });
    });
});
