import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn(() => ({
            reasoner: null,
            executeInference: vi.fn(),
            dataFactory: {
                namedNode: (iri: string) => ({ termType: 'NamedNode', value: iri }),
                quad: (s: any, p: any, o: any, g: any) => ({ subject: s, predicate: p, object: o, graph: g }),
            },
            add: vi.fn(),
            graphs: [],
        })),
    },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri } from '@src/utilities/mocks/vscode';
import { SparqlDocument } from '@src/languages/sparql/sparql-document';
import { RdfSyntax, RdfToken } from '@faubulous/mentor-rdf-parsers';

/**
 * Build a minimal IToken with position information.
 * Positions follow the chevrotain convention: 1-based lines, 1-based columns.
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

function makeDoc(uri = 'file:///test.sparql'): SparqlDocument {
    return new SparqlDocument(Uri.parse(uri) as any);
}

describe('SparqlDocument', () => {
    describe('initial state', () => {
        it('constructs with the given URI', () => {
            const doc = makeDoc();
            expect(doc.uri.toString()).toBe('file:///test.sparql');
        });

        it('constructs with Sparql syntax', () => {
            const doc = makeDoc();
            expect(doc.syntax).toBe(RdfSyntax.Sparql);
        });

        it('isLoaded returns false when no tokens', () => {
            const doc = makeDoc();
            expect(doc.isLoaded).toBe(false);
        });

        it('isLoaded returns true when tokens are present', () => {
            const doc = makeDoc();
            doc.setTokens([makeToken(RdfToken.IRIREF.name, '<http://example.org/>') as any]);
            expect(doc.isLoaded).toBe(true);
        });
    });

    describe('no-ops', () => {
        it('infer resolves without doing anything', async () => {
            const doc = makeDoc();
            await expect(doc.infer()).resolves.toBeUndefined();
        });

        it('loadTriples resolves without doing anything', async () => {
            const doc = makeDoc();
            await expect(doc.loadTriples('SELECT * WHERE { ?s ?p ?o }')).resolves.toBeUndefined();
        });
    });

    describe('setTokens — SPARQL reference indexing', () => {
        it('indexes an IRIREF in a FROM clause', () => {
            const doc = makeDoc();
            const iri = 'workspace:///notebook.mnb#cell-1';
            doc.setTokens([
                makeToken(RdfToken.FROM.name, 'FROM'),
                makeToken(RdfToken.IRIREF.name, `<${iri}>`, { startColumn: 6 }),
            ] as any);
            expect(doc.references[iri]).toBeDefined();
            expect(doc.references[iri]).toHaveLength(1);
        });

        it('indexes an IRIREF in a FROM NAMED clause', () => {
            const doc = makeDoc();
            const iri = 'workspace:///notebook.mnb#my-ontology';
            doc.setTokens([
                makeToken(RdfToken.FROM.name, 'FROM'),
                makeToken(RdfToken.NAMED.name, 'NAMED', { startColumn: 6 }),
                makeToken(RdfToken.IRIREF.name, `<${iri}>`, { startColumn: 12 }),
            ] as any);
            expect(doc.references[iri]).toBeDefined();
            expect(doc.references[iri]).toHaveLength(1);
        });

        it('indexes an IRIREF in a GRAPH clause', () => {
            const doc = makeDoc();
            const iri = 'workspace:///data.ttl';
            doc.setTokens([
                makeToken(RdfToken.IRIREF.name, `<${iri}>`, { startColumn: 7 }),
            ] as any);
            expect(doc.references[iri]).toBeDefined();
        });

        it('indexes multiple occurrences of the same IRI', () => {
            const doc = makeDoc();
            const iri = 'workspace:///notebook.mnb#cell-1';
            doc.setTokens([
                makeToken(RdfToken.FROM.name, 'FROM', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.IRIREF.name, `<${iri}>`, { startLine: 1, startColumn: 6 }),
                makeToken(RdfToken.FROM.name, 'FROM', { startLine: 2, startColumn: 1 }),
                makeToken(RdfToken.IRIREF.name, `<${iri}>`, { startLine: 2, startColumn: 6 }),
            ] as any);
            expect(doc.references[iri]).toHaveLength(2);
        });

        it('indexes a PNAME_LN token as a reference', () => {
            const doc = makeDoc();
            // Set up namespace so the prefixed name can be expanded
            doc.setTokens([
                makeToken(RdfToken.PREFIX.name, 'PREFIX', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 8 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, startColumn: 12 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 33 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:MyClass', { startLine: 2, startColumn: 1 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 2, startColumn: 11 }),
            ] as any);
            expect(doc.references['http://example.org/MyClass']).toBeDefined();
            expect(doc.references['http://example.org/MyClass']).toHaveLength(1);
        });

        it('does not index PNAME_NS that immediately follows a PREFIX keyword as a reference', () => {
            const doc = makeDoc();
            doc.setTokens([
                makeToken(RdfToken.PREFIX.name, 'PREFIX', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 8 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, startColumn: 12 }),
            ] as any);
            // The PNAME_NS 'ex:' after PREFIX is a declaration, not a reference
            expect(doc.references['ex:']).toBeUndefined();
        });

        it('records the correct range for an indexed IRI', () => {
            const doc = makeDoc();
            const iri = 'workspace:///notebook.mnb#cell-1';
            const image = `<${iri}>`;
            doc.setTokens([
                makeToken(RdfToken.IRIREF.name, image, { startLine: 3, startColumn: 6, endLine: 3, endColumn: 6 + image.length - 1 }),
            ] as any);
            const ranges = doc.references[iri];
            expect(ranges).toBeDefined();
            expect(ranges[0].start.line).toBe(2); // 0-based (chevrotain is 1-based)
        });

        it('resets references on a second setTokens call', () => {
            const doc = makeDoc();
            const iri1 = 'workspace:///notebook.mnb#cell-1';
            const iri2 = 'workspace:///notebook.mnb#cell-2';
            doc.setTokens([makeToken(RdfToken.IRIREF.name, `<${iri1}>`) as any]);
            expect(doc.references[iri1]).toBeDefined();
            doc.setTokens([makeToken(RdfToken.IRIREF.name, `<${iri2}>`) as any]);
            expect(doc.references[iri1]).toBeUndefined();
            expect(doc.references[iri2]).toBeDefined();
        });
    });
});
