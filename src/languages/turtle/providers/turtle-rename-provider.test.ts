import { describe, it, expect, vi } from 'vitest';
import { createRangeIndex } from '@src/utilities/mocks/factories';
import { RangeIndex } from '@src/services/document/range-index';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({ getDocumentContext: () => null })) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position, Range } from '@src/utilities/mocks/vscode';
import { getTextEdits, createTurtleDocument } from '@src/utilities/mocks/factories';
import { TurtleRenameProvider } from '@src/languages/turtle/providers/turtle-rename-provider';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

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
    return createTurtleDocument(uri);
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
    const provider = new TurtleRenameProvider({ getDocumentContext: () => null } as any);
    vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue(makeContextService(context));
    return provider;
}

describe('TurtleRenameProvider', () => {
    describe('contextService getter', () => {
        it('returns the document context service via container (getter body executed)', async () => {
            // No spy on contextService: the real getter body (line 15) executes.
            // The container mock returns { getDocumentContext: () => null },
            // so prepareRename returns null without further logic.
            const provider = new TurtleRenameProvider({ getDocumentContext: () => null } as any);
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

        it('returns an empty WorkspaceEdit when context is null', async () => {
            const provider = makeProvider(null);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'newName');
            expect(edits.size).toBe(0);
        });

        it('returns an empty WorkspaceEdit when no token covers the position', async () => {
            const context = makeDoc();
            // No tokens set — getTokenAtPosition returns undefined
            const provider = makeProvider(context);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect(edits.size).toBe(0);
        });

        it('produces replace edits for all occurrences of a renamed prefix', async () => {
            const context = makeDoc();
            // Two tokens that share the prefix "ex"
            const t1 = makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 1, endColumn: 3 });
            const t2 = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startLine: 2, startColumn: 1, endColumn: 8 });
            context.setTokens([t1, t2] as any);

            const provider = makeProvider(context);
            // Position on the prefix of t1: character 0 is 'e' of 'ex:'
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'ns');
            // Two tokens with prefix "ex" → two replace edits
            expect(getTextEdits(edits)).toHaveLength(2);
        });

        it('produces replace edits for all occurrences of a renamed variable', async () => {
            const context = makeDoc();
            const varToken = makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 1, endColumn: 2 });
            const varToken2 = makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 10, endColumn: 11 });
            context.setTokens([varToken, varToken2] as any);

            const provider = makeProvider(context);
            // Cursor on the first ?x
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 1) as any, '?y');
            expect(getTextEdits(edits)).toHaveLength(2);
        });

        it('produces one edit for an IRI token that appears once in references', async () => {
            const context = makeDoc();
            // An IRIREF token at column 1 — setTokens registers it as a subject/reference
            const token = makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', {
                startLine: 1, startColumn: 1, endColumn: 25
            });
            context.setTokens([token] as any);

            const provider = makeProvider(context);
            // The reference is registered, so we expect exactly one rename edit
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect(getTextEdits(edits)).toHaveLength(1);
        });

        it('returns empty edits when token is not prefix/variable and getIriFromToken returns null', async () => {
            const context = makeDoc();
            // A period token: not a prefix token, not a variable → else branch; getIriFromToken → null
            const token = makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 });
            context.setTokens([token] as any);

            const provider = makeProvider(context);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'newName');
            expect(edits.size).toBe(0);
        });

        it('returns empty edits when IRI has no registered references', async () => {
            const context = makeDoc();
            const token = makeToken(RdfToken.IRIREF.name, '<http://example.org/NoRef>', {
                startLine: 1, startColumn: 1, endColumn: 24
            });
            context.setTokens([token] as any);
            // Clear references so the IRI has no entries
            (context as any).references = new RangeIndex();

            const provider = makeProvider(context);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect(edits.size).toBe(0);
        });

        it('skips prefix token when getPrefixEditRange returns null', async () => {
            // Cover line 67: `if (!r) continue` in the PNAME_NS/PNAME_LN case
            const context = makeDoc();
            const prefixToken = makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 1, endColumn: 3 });
            context.setTokens([prefixToken] as any);

            const provider = makeProvider(context);
            vi.spyOn(provider as any, 'getPrefixEditRange').mockReturnValue(null);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 0) as any, 'ns');
            expect(edits.size).toBe(0);
        });

        it('skips variable token when getLabelEditRange returns null', async () => {
            // Cover line 84: `if (!r) continue` in the variable branch
            const context = makeDoc();
            const varToken = makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 1, endColumn: 2 });
            context.setTokens([varToken] as any);

            const provider = makeProvider(context);
            vi.spyOn(provider as any, 'getLabelEditRange').mockReturnValue(null);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 1) as any, '?y');
            expect(edits.size).toBe(0);
        });

        it('skips reference when no token is found at the reference position', async () => {
            // Cover the `if (!token) continue` path in the IRI reference branch:
            // the cursor resolves to the IRI token, but the registered reference points
            // at a position with no token.
            const context = makeDoc();
            const iriToken = makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', {
                startLine: 1, startColumn: 1, endColumn: 25
            });
            context.setTokens([iriToken] as any);
            // Point the reference at a line with no token so getTokenAtPosition returns undefined.
            (context as any).references = createRangeIndex({ 'http://example.org/Thing': [new Range(99, 0, 99, 5)] });

            const provider = makeProvider(context);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect(edits.size).toBe(0);
        });

        it('skips reference when getLabelEditRange returns null for reference token', async () => {
            // Cover the `if (!editRange) continue` path: a reference token is found,
            // but getLabelEditRange returns null.
            const context = makeDoc();
            const iriToken = makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', {
                startLine: 1, startColumn: 1, endColumn: 25
            });
            context.setTokens([iriToken] as any);

            const provider = makeProvider(context);
            vi.spyOn(provider as any, 'getLabelEditRange').mockReturnValue(null);
            const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 5) as any, 'newName');
            expect(edits.size).toBe(0);
        });
    });

    describe('Triplate template-parameter rename', () => {
        const template = [
            '---',
            'params { numbers: int[] }',
            'example demo { numbers: [1, 2] }',
            '---',
            'SELECT * WHERE { VALUES ?n { ${...numbers} } }',
            '',
        ].join('\n');

        // A document mock with real text/offset/position mapping (the param path needs getText).
        function makeTemplateDoc(text: string) {
            const lines = text.split('\n');
            return {
                uri: Uri.parse('file:///t.sparql'),
                getText: () => text,
                offsetAt: (pos: any) => {
                    let offset = 0;
                    for (let i = 0; i < pos.line; i++) offset += lines[i].length + 1;
                    return offset + pos.character;
                },
                positionAt: (offset: number) => {
                    const before = text.slice(0, offset);
                    const split = before.split('\n');
                    return new Position(split.length - 1, split[split.length - 1].length);
                },
            } as any;
        }

        it('prepareRename returns a range when the cursor is on a declared parameter', async () => {
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc(template);
            const offset = template.indexOf('${...numbers}') + '${...'.length; // inside the ref name
            const range = await provider.prepareRename(doc, doc.positionAt(offset));

            expect(range).not.toBeNull();
        });

        it('renames a parameter across its declaration, example binding key and ${ref}', async () => {
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc(template);
            const offset = template.indexOf('${...numbers}') + '${...'.length;
            const edits = await provider.provideRenameEdits(doc, doc.positionAt(offset), 'values');

            // paramDecl + bindingKey + paramRef = three sites.
            expect(getTextEdits(edits)).toHaveLength(3);
        });

        it('falls through to RDF rename for a non-parameter position', async () => {
            // A plain (non-template) document must not be treated as a parameter rename.
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc('PREFIX ex: <http://example.org/>\nex:s ex:p ex:o .');
            const offset = 0;
            const range = await provider.prepareRename(doc, doc.positionAt(offset)).catch(() => 'threw');

            // Not a template → param check returns null → RDF token path runs (no token here → throws).
            expect(range).toBe('threw');
        });
    });

    describe('Triplate template loop-variable rename', () => {
        function makeTemplateDoc(text: string) {
            const lines = text.split('\n');
            return {
                uri: Uri.parse('file:///t.sparql'),
                getText: () => text,
                offsetAt: (pos: any) => {
                    let offset = 0;
                    for (let i = 0; i < pos.line; i++) offset += lines[i].length + 1;
                    return offset + pos.character;
                },
                positionAt: (offset: number) => {
                    const before = text.slice(0, offset);
                    const split = before.split('\n');
                    return new Position(split.length - 1, split[split.length - 1].length);
                },
            } as any;
        }

        const template = [
            '---',
            'params { graphIris: iri[] }',
            '---',
            'CONSTRUCT { ?s ?p ?o }',
            '{% for g in graphIris %}',
            'FROM ${g}',
            '{% endfor %}',
            '',
        ].join('\n');

        it('prepareRename returns a range when the cursor is on a loop declaration', async () => {
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc(template);
            const offset = template.indexOf('{% for g') + '{% for '.length; // the `g` after `for`
            const range = await provider.prepareRename(doc, doc.positionAt(offset));

            expect(range).not.toBeNull();
        });

        it('renames a loop variable across its declaration and in-scope reference', async () => {
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc(template);
            const offset = template.indexOf('FROM ${g}') + 'FROM ${'.length; // the `g` reference
            const edits = await provider.provideRenameEdits(doc, doc.positionAt(offset), 'graph');

            // loopDecl + loopRef = two sites (the `graphIris` source stays a paramRef, untouched).
            expect(getTextEdits(edits)).toHaveLength(2);
        });

        it('keeps same-named loops independent (scope, not name)', async () => {
            const shadowed = [
                '---',
                'params { a: iri[], b: iri[] }',
                '---',
                '{% for g in a %}${g}{% endfor %}',
                '{% for g in b %}${g} ${g}{% endfor %}',
                '',
            ].join('\n');
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc(shadowed);
            const offset = shadowed.indexOf('{% for g in b %}') + '{% for '.length; // second loop's `g`
            const edits = await provider.provideRenameEdits(doc, doc.positionAt(offset), 'h');

            // Only the second loop: its loopDecl + two loopRefs = three sites (first loop untouched).
            expect(getTextEdits(edits)).toHaveLength(3);
        });

        it('renames the loop source via the parameter path, not the loop path', async () => {
            const provider = makeProvider(makeDoc());
            const doc = makeTemplateDoc(template);
            const offset = template.indexOf('in graphIris') + 'in '.length; // the `graphIris` source
            const edits = await provider.provideRenameEdits(doc, doc.positionAt(offset), 'graphs');

            // paramDecl + the `for` source paramRef = two sites; the loop variable is untouched.
            expect(getTextEdits(edits)).toHaveLength(2);
        });
    });
});

describe('TurtleRenameProvider across files', () => {
    const text = '@prefix ex: <http://example.org/> .\nex:Thing a ex:Class .\n<http://example.org/Other> a ex:Class .\n';
    const docUri = Uri.parse('file:///test.ttl') as any;

    /**
     * Creates a provider over a parsed document and a workspace rename service spy.
     */
    function setup(source = text) {
        const context = makeDoc();

        context.parse(source);

        const workspaceRenameService = { addEditsInOtherFiles: vi.fn(async () => 0) };
        const provider = new TurtleRenameProvider(makeContextService(context) as any, workspaceRenameService);

        return { provider, workspaceRenameService };
    }

    it('extends the rename of a prefixed name to the other files', async () => {
        const { provider, workspaceRenameService } = setup();

        const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(1, 4) as any, 'Entity');

        expect(workspaceRenameService.addEditsInOtherFiles).toHaveBeenCalledExactlyOnceWith(edits, 'http://example.org/Thing', 'Entity', docUri);
    });

    it('extends the rename of an IRI reference to the other files', async () => {
        const { provider, workspaceRenameService } = setup();

        await provider.provideRenameEdits({ uri: docUri } as any, new Position(2, 22) as any, 'Entity');

        expect(workspaceRenameService.addEditsInOtherFiles).toHaveBeenCalledWith(expect.anything(), 'http://example.org/Other', 'Entity', docUri);
    });

    it('keeps the edits in the document without confirmation', async () => {
        const { provider } = setup();

        const edits = await provider.provideRenameEdits({ uri: docUri } as any, new Position(1, 4) as any, 'Entity');
        const [[, textEdits]] = edits.entries();

        expect(textEdits).toHaveLength(1);
        expect((textEdits[0] as any).metadata).toBeUndefined();
    });

    it('keeps the rename of a prefix within the document', async () => {
        const { provider, workspaceRenameService } = setup();

        await provider.provideRenameEdits({ uri: docUri } as any, new Position(1, 0) as any, 'ns');

        expect(workspaceRenameService.addEditsInOtherFiles).not.toHaveBeenCalled();
    });

    it('keeps the rename of a variable within the document', async () => {
        const context = makeDoc();
        const workspaceRenameService = { addEditsInOtherFiles: vi.fn(async () => 0) };

        context.setTokens([makeToken(RdfToken.VAR1.name, '?x', { startLine: 1, startColumn: 1, endColumn: 2 })] as any);

        const provider = new TurtleRenameProvider(makeContextService(context) as any, workspaceRenameService);

        await provider.provideRenameEdits({ uri: docUri } as any, new Position(0, 1) as any, 'y');

        expect(workspaceRenameService.addEditsInOtherFiles).not.toHaveBeenCalled();
    });
});
