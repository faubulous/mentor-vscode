import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position, Range } from '@src/utilities/mocks/vscode';
import { TurtleRenameProvider } from './turtle-rename-provider';
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
    });
});
