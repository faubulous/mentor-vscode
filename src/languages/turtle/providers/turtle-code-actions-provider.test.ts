import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockGetDocumentContext, mockGetPrefixesWithErrorCode } = vi.hoisted(() => ({
    mockGetDocumentContext: vi.fn(),
    mockGetPrefixesWithErrorCode: vi.fn(() => [] as string[]),
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'DocumentContextService') return { getDocumentContext: mockGetDocumentContext };
            return {};
        }),
    },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

vi.mock('@src/utilities/vscode/diagnostic', () => ({
    getPrefixesWithErrorCode: (...args: any[]) => mockGetPrefixesWithErrorCode(...args),
}));

vi.mock('@src/services/tokens', () => ({
    ServiceToken: { DocumentContextService: 'DocumentContextService' },
}));

import { TurtleCodeActionsProvider } from '@src/languages/turtle/providers/turtle-code-actions-provider';
import { CodeActionKind, Range, Position } from '@src/utilities/mocks/vscode';

// A mock document with lineAt/lineCount support
const mockDoc = {
    uri: vscode.Uri.parse('file:///test.ttl'),
    getText: () => '',
    lineCount: 20,
    lineAt: (line: number) => ({
        range: new Range(new Position(line, 0), new Position(line, 80)),
        rangeIncludingLineBreak: new Range(new Position(line, 0), new Position(line + 1, 0)),
    }),
} as any;

const emptyRange = new Range(new Position(0, 0), new Position(0, 0));

// Token factory helpers
function makeToken(name: string, image: string, line = 1, col = 1): any {
    return {
        tokenType: { name },
        image,
        startLine: line,
        startColumn: col,
        endLine: line,
        endColumn: col + image.length - 1,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocumentContext.mockReturnValue(null);
    mockGetPrefixesWithErrorCode.mockReturnValue([]);
});

describe('TurtleCodeActionsProvider', () => {
    describe('providedCodeActionKinds', () => {
        it('is a non-empty array', () => {
            expect(TurtleCodeActionsProvider.providedCodeActionKinds.length).toBeGreaterThan(0);
        });

        it('contains a QuickFix kind', () => {
            expect(TurtleCodeActionsProvider.providedCodeActionKinds).toContainEqual(CodeActionKind.QuickFix);
        });

        it('contains a Refactor kind', () => {
            expect(TurtleCodeActionsProvider.providedCodeActionKinds).toContainEqual(CodeActionKind.Refactor);
        });

        it('contains exactly two kinds', () => {
            expect(TurtleCodeActionsProvider.providedCodeActionKinds).toHaveLength(2);
        });
    });

    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleCodeActionsProvider()).not.toThrow();
        });
    });

    describe('provideCodeActions', () => {
        it('returns empty array when no document context', async () => {
            mockGetDocumentContext.mockReturnValue(null);
            const provider = new TurtleCodeActionsProvider();
            const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);
            expect(Array.isArray(result)).toBe(true);
        });

        it('returns array when context exists but no tokens', async () => {
            mockGetDocumentContext.mockReturnValue({
                tokens: [],
                getTokenAtPosition: vi.fn(() => null),
                getTokenIndexAtPosition: vi.fn(() => -1),
            });
            const provider = new TurtleCodeActionsProvider();
            const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);
            expect(Array.isArray(result)).toBe(true);
        });

        it('calls _provideFixMissingPrefixesActions with diagnostics', async () => {
            mockGetDocumentContext.mockReturnValue(null);
            mockGetPrefixesWithErrorCode.mockReturnValue([]);
            const provider = new TurtleCodeActionsProvider();
            const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [{ code: 'missingPrefix', message: '' }], triggerKind: 1 } as any);
            expect(Array.isArray(result)).toBe(true);
        });

        describe('IRIREF token → Define prefix for IRI action', () => {
            it('returns a code action to define prefix for IRI when cursor is on IRIREF', async () => {
                const irirefToken = makeToken(RdfToken.IRIREF.name, '<http://example.org/foo#Bar>');
                mockGetDocumentContext.mockReturnValue({
                    tokens: [irirefToken],
                    getTokenAtPosition: vi.fn(() => irirefToken),
                    getTokenIndexAtPosition: vi.fn(() => 0),
                });

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const action = result.find(a => a.command?.command === 'mentor.command.implementPrefixForIri');
                expect(action).toBeDefined();
                expect(action!.title).toBe('Define prefix for IRI');
                expect(action!.kind).toEqual(CodeActionKind.Refactor);
            });
        });

        describe('PNAME_NS token → Sort prefixes action', () => {
            it('returns sort prefixes action when cursor is on PNAME_NS', async () => {
                const pnameToken = makeToken(RdfToken.PNAME_NS.name, 'ex:');
                mockGetDocumentContext.mockReturnValue({
                    tokens: [pnameToken],
                    getTokenAtPosition: vi.fn(() => pnameToken),
                    getTokenIndexAtPosition: vi.fn(() => 0),
                });

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const sortAction = result.find(a => a.command?.command === 'mentor.command.sortPrefixes');
                expect(sortAction).toBeDefined();
                expect(sortAction!.title).toBe('Sort prefixes');
            });

            it('does NOT return a convert action for PNAME_NS (only PREFIX/TTL_PREFIX get convert actions)', async () => {
                const pnameToken = makeToken(RdfToken.PNAME_NS.name, 'ex:');
                mockGetDocumentContext.mockReturnValue({
                    tokens: [pnameToken],
                    getTokenAtPosition: vi.fn(() => pnameToken),
                    getTokenIndexAtPosition: vi.fn(() => 0),
                });

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const convertAction = result.find(a => a.title?.startsWith('Convert all'));
                expect(convertAction).toBeUndefined();
            });
        });

        describe('PREFIX token → Convert all to @prefix', () => {
            it('returns sort and convert-to-@prefix actions for PREFIX token', async () => {
                const prefixToken = makeToken(RdfToken.PREFIX.name, 'PREFIX', 1, 1);
                const pnameNsToken = makeToken(RdfToken.PNAME_NS.name, 'ex:', 1, 8);
                const irirefToken = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 1, 12);
                const tokens = [prefixToken, pnameNsToken, irirefToken];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => prefixToken),
                    getTokenIndexAtPosition: vi.fn(() => 0),
                });

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const sortAction = result.find(a => a.command?.command === 'mentor.command.sortPrefixes');
                expect(sortAction).toBeDefined();

                const convertAction = result.find(a => a.title === 'Convert all to @prefix');
                expect(convertAction).toBeDefined();
                expect(convertAction!.kind).toEqual(CodeActionKind.Refactor);
            });
        });

        describe('TTL_PREFIX token → Convert all to PREFIX', () => {
            it('returns sort and convert-to-PREFIX actions for TTL_PREFIX token', async () => {
                const ttlPrefixToken = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 1, 1);
                const pnameNsToken = makeToken(RdfToken.PNAME_NS.name, 'rdfs:', 1, 9);
                const irirefToken = makeToken(RdfToken.IRIREF.name, '<http://www.w3.org/2000/01/rdf-schema#>', 1, 15);
                const tokens = [ttlPrefixToken, pnameNsToken, irirefToken];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => ttlPrefixToken),
                    getTokenIndexAtPosition: vi.fn(() => 0),
                });

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const sortAction = result.find(a => a.command?.command === 'mentor.command.sortPrefixes');
                expect(sortAction).toBeDefined();

                const convertAction = result.find(a => a.title === 'Convert all to PREFIX');
                expect(convertAction).toBeDefined();
            });
        });

        describe('_createInlineSelectedPrefixesAction', () => {
            it('returns inline action when selection contains a prefix declaration with usages', async () => {
                // @prefix ex: <http://example.org/> .   (line 0)
                // ex:Foo rdfs:type ex:Bar .             (line 1)
                const ttlPrefix = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 1, 1);
                const pnameDecl = makeToken(RdfToken.PNAME_NS.name, 'ex:', 1, 9);
                const irirefDecl = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 1, 13);
                const pnameLn = { ...makeToken(RdfToken.PNAME_LN.name, 'ex:Foo', 2, 1), startLine: 2, endLine: 2 };
                const period = makeToken(RdfToken.PERIOD.name, '.', 1, 35);
                const tokens = [ttlPrefix, pnameDecl, irirefDecl, period, pnameLn];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => null),
                    getTokenIndexAtPosition: vi.fn(() => -1),
                });

                // Selection spans line 0 (where @prefix is)
                const selection = new Range(new Position(0, 0), new Position(0, 40));

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);

                const inlineAction = result.find(a => a.title?.startsWith('Inline prefix'));
                expect(inlineAction).toBeDefined();
            });

            it('does not return inline action when selection has no prefix declarations', async () => {
                const pnameLn = makeToken(RdfToken.PNAME_LN.name, 'ex:Foo', 2, 1);
                mockGetDocumentContext.mockReturnValue({
                    tokens: [pnameLn],
                    getTokenAtPosition: vi.fn(() => null),
                    getTokenIndexAtPosition: vi.fn(() => -1),
                });

                const selection = new Range(new Position(1, 0), new Position(1, 10));

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);

                const inlineAction = result.find(a => a.title?.startsWith('Inline prefix'));
                expect(inlineAction).toBeUndefined();
            });

            it('returns undefined when prefix declaration token has no namespace definition', async () => {
                // A PREFIX token that getNamespaceDefinition cannot resolve (no IRIREF after it)
                const prefixToken = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 1, 1);
                mockGetDocumentContext.mockReturnValue({
                    tokens: [prefixToken],
                    getTokenAtPosition: vi.fn(() => null),
                });

                const selection = new Range(new Position(0, 0), new Position(0, 50));
                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);
                const inlineAction = result.find(a => a.title?.startsWith('Inline'));
                expect(inlineAction).toBeUndefined();
            });

            it('handles PNAME token on same line as prefix declaration (skip usage)', async () => {
                // @prefix ex: <http://example.org/> .  on line 0
                // ex: (PNAME_NS also on line 0, same as prefix decl → should be skipped as replacement)
                const ttlPrefix = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 1, 1);
                const pnameDecl = makeToken(RdfToken.PNAME_NS.name, 'ex:', 1, 9);
                const irirefDecl = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 1, 13);
                const period = makeToken(RdfToken.PERIOD.name, '.', 1, 35);
                const tokens = [ttlPrefix, pnameDecl, irirefDecl, period];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => null),
                });

                const selection = new Range(new Position(0, 0), new Position(0, 40));
                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);
                // PNAME on same declaration line is skipped (no replacement), but prefix line is deleted
                // → edit.size > 0 (delete edit present), action IS returned
                const inlineAction = result.find(a => a.title?.startsWith('Inline'));
                expect(inlineAction).toBeDefined();
            });

            it('handles PNAME token with unknown prefix (not in prefixToIri map)', async () => {
                // @prefix ex: <http://example.org/> .   (line 0)
                // other:Foo on line 1 — prefix 'other' not in selected declarations
                const ttlPrefix = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 1, 1);
                const pnameDecl = makeToken(RdfToken.PNAME_NS.name, 'ex:', 1, 9);
                const irirefDecl = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 1, 13);
                const period = makeToken(RdfToken.PERIOD.name, '.', 1, 35);
                const otherPname = { ...makeToken(RdfToken.PNAME_LN.name, 'other:Foo', 2, 1), startLine: 2, endLine: 2 };
                const tokens = [ttlPrefix, pnameDecl, irirefDecl, period, otherPname];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => null),
                });

                const selection = new Range(new Position(0, 0), new Position(0, 40));
                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);
                // 'other' prefix is not in prefixToIri map → skipped (no replacement added)
                // declaration delete is still added → edit.size > 0, action IS returned
                const inlineAction = result.find(a => a.title?.startsWith('Inline'));
                expect(inlineAction).toBeDefined();
            });

            it('skips prefix declaration line when it is out of document bounds', async () => {
                // Cover line 164: `if (line < 0 || line >= document.lineCount) continue`
                // Token on line 25 (0-indexed = 24) which is >= mockDoc.lineCount (20)
                const ttlPrefix = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 25, 1);
                const pnameDecl = makeToken(RdfToken.PNAME_NS.name, 'ex:', 25, 9);
                const irirefDecl = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 25, 13);
                const period = makeToken(RdfToken.PERIOD.name, '.', 25, 35);
                const tokens = [ttlPrefix, pnameDecl, irirefDecl, period];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => null),
                });

                const selection = new Range(new Position(24, 0), new Position(24, 40));
                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);
                // No edit was added (declaration line is out of bounds, no PNAME replacements)
                // → edit.size === 0 → action not returned
                const inlineAction = result.find(a => a.title?.startsWith('Inline'));
                expect(inlineAction).toBeUndefined();
            });

            it('skips PNAME token when expanded IRI is undefined', async () => {
                // Cover line 187: `if (!expandedIri) continue`
                // Create a PNAME_LN token whose image has no colon → getIriFromPrefixedName returns undefined
                const ttlPrefix = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', 1, 1);
                const pnameDecl = makeToken(RdfToken.PNAME_NS.name, 'ex:', 1, 9);
                const irirefDecl = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 1, 13);
                const period = makeToken(RdfToken.PERIOD.name, '.', 1, 35);
                // PNAME_LN token with no colon in image → getIriFromPrefixedName returns undefined
                const noColonToken = { ...makeToken(RdfToken.PNAME_LN.name, 'ex', 2, 1), startLine: 2, endLine: 2 };
                const tokens = [ttlPrefix, pnameDecl, irirefDecl, period, noColonToken];

                mockGetDocumentContext.mockReturnValue({
                    tokens,
                    getTokenAtPosition: vi.fn(() => null),
                });

                const selection = new Range(new Position(0, 0), new Position(0, 40));
                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, selection, { diagnostics: [], triggerKind: 1 } as any);
                // Declaration line is deleted (edit.size > 0), action IS returned (just no replacement for 'ex')
                const inlineAction = result.find(a => a.title?.startsWith('Inline'));
                expect(inlineAction).toBeDefined();
            });
        });

        describe('_provideFixMissingPrefixesActions', () => {
            it('returns "Implement missing prefixes" when document has undefined prefixes', async () => {
                mockGetDocumentContext.mockReturnValue(null);
                mockGetPrefixesWithErrorCode.mockImplementation((_doc, _diag, code) =>
                    code === 'UndefinedNamespacePrefixError' ? ['owl'] : []
                );

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const action = result.find(a => a.title === 'Implement missing prefixes');
                expect(action).toBeDefined();
                expect(action!.command?.command).toBe('mentor.command.implementPrefixes');
                expect(action!.kind).toEqual(CodeActionKind.QuickFix);
            });

            it('returns "Remove unused prefixes" when document has unused prefixes', async () => {
                mockGetDocumentContext.mockReturnValue(null);
                mockGetPrefixesWithErrorCode.mockImplementation((_doc, _diag, code) =>
                    code === 'UnusedNamespacePrefixHint' ? ['rdfs'] : []
                );

                const provider = new TurtleCodeActionsProvider();
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: [], triggerKind: 1 } as any);

                const action = result.find(a => a.title === 'Remove unused prefixes');
                expect(action).toBeDefined();
                expect(action!.command?.command).toBe('mentor.command.deletePrefixes');
            });

            it('returns per-diagnostic "Implement missing prefix: X" action', async () => {
                mockGetDocumentContext.mockReturnValue(null);
                // Document-level calls return empty, per-diagnostic call returns ['foaf']
                mockGetPrefixesWithErrorCode.mockImplementation((_doc, diagnostics, code) => {
                    if (code === 'UndefinedNamespacePrefixError' && Array.isArray(diagnostics) && diagnostics.length > 0) return ['foaf'];
                    return [];
                });

                const provider = new TurtleCodeActionsProvider();
                const diag = [{ code: 'UndefinedNamespacePrefixError', message: 'foaf: not defined' }];
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: diag, triggerKind: 1 } as any);

                const action = result.find(a => a.title === 'Implement missing prefix: foaf');
                expect(action).toBeDefined();
                expect(action!.command?.command).toBe('mentor.command.implementPrefixes');
            });

            it('returns per-diagnostic "Remove unused prefix: X" action', async () => {
                mockGetDocumentContext.mockReturnValue(null);
                mockGetPrefixesWithErrorCode.mockImplementation((_doc, diagnostics, code) => {
                    if (code === 'UnusedNamespacePrefixHint' && Array.isArray(diagnostics) && diagnostics.length > 0) return ['skos'];
                    return [];
                });

                const provider = new TurtleCodeActionsProvider();
                const diag = [{ code: 'UnusedNamespacePrefixHint', message: 'skos: unused' }];
                const result = await provider.provideCodeActions(mockDoc, emptyRange, { diagnostics: diag, triggerKind: 1 } as any);

                const action = result.find(a => a.title === 'Remove unused prefix: skos');
                expect(action).toBeDefined();
                expect(action!.command?.command).toBe('mentor.command.deletePrefixes');
            });
        });
    });
});

