import { describe, it, expect, vi } from 'vitest';
import { DataFactory } from 'n3';
import { SparqlResultSerializer } from './sparql-result-serializer';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Minimal cancellation token that is never cancelled
const token = {
    isCancellationRequested: false,
    onCancellationRequested: (_handler: any) => ({ dispose: () => {} }),
};

// Minimal prefix lookup service that never resolves prefixes
const noPrefixService = {
    getPrefixForIri: (_docIri: string, _iri: string, defaultValue: string) => defaultValue,
    getInferencePrefixes: () => ({}),
    getDefaultPrefixes: () => ({}),
};

// Async generator helper to create AsyncIterable from items
async function* asyncGen<T>(...items: T[]): AsyncIterable<T> {
    for (const item of items) {
        yield item;
    }
}

function makeContext(query?: string) {
    return {
        id: 'test',
        documentIri: 'file:///test.sparql',
        startTime: Date.now(),
        query,
    };
}

describe('SparqlResultSerializer', () => {
    describe('serializeBindings', () => {
        it('returns empty bindings result for empty stream', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const result = await serializer.serializeBindings(
                makeContext() as any,
                asyncGen() as any,
                token as any
            );
            expect(result.type).toBe('bindings');
            expect(result.columns).toEqual([]);
            expect(result.rows).toEqual([]);
            expect(result.namespaceMap).toEqual({});
        });

        it('collects column names from binding keys', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const binding = new Map([
                [{ termType: 'Variable', value: 'x' }, { termType: 'NamedNode', value: 'http://example.org/foo' }],
                [{ termType: 'Variable', value: 'y' }, { termType: 'Literal', value: 'hello', datatype: { value: 'http://www.w3.org/2001/XMLSchema#string' }, language: '' }],
            ]);
            const result = await serializer.serializeBindings(
                makeContext() as any,
                asyncGen(binding) as any,
                token as any
            );
            expect(result.columns).toContain('x');
            expect(result.columns).toContain('y');
            expect(result.rows).toHaveLength(1);
        });

        it('serializes NamedNode term correctly', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const binding = new Map([
                [{ termType: 'Variable', value: 's' }, { termType: 'NamedNode', value: 'http://example.org/subject' }],
            ]);
            const result = await serializer.serializeBindings(
                makeContext() as any,
                asyncGen(binding) as any,
                token as any
            );
            const row = result.rows[0];
            expect(row['s'].termType).toBe('NamedNode');
            expect(row['s'].value).toBe('http://example.org/subject');
        });

        it('serializes Literal term with datatype and language', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const binding = new Map([
                [{
                    termType: 'Variable', value: 'label'
                }, {
                    termType: 'Literal',
                    value: 'Hello',
                    datatype: { termType: 'NamedNode', value: 'http://www.w3.org/2001/XMLSchema#string' },
                    language: 'en'
                }],
            ]);
            const result = await serializer.serializeBindings(
                makeContext() as any,
                asyncGen(binding) as any,
                token as any
            );
            const row = result.rows[0];
            expect(row['label'].termType).toBe('Literal');
            expect(row['label'].value).toBe('Hello');
            expect(row['label'].language).toBe('en');
            expect(row['label'].datatype.termType).toBe('NamedNode');
        });

        it('resolves prefix for NamedNode namespaces', async () => {
            const prefixService = {
                getPrefixForIri: (_docIri: string, iri: string, _default: string) => {
                    if (iri === 'http://example.org/') return 'ex';
                    return _default;
                },
            };
            const serializer = new SparqlResultSerializer(prefixService as any);
            const binding = new Map([
                [{ termType: 'Variable', value: 'x' }, { termType: 'NamedNode', value: 'http://example.org/foo' }],
            ]);
            const result = await serializer.serializeBindings(
                makeContext() as any,
                asyncGen(binding) as any,
                token as any
            );
            expect(result.namespaceMap['http://example.org/']).toBe('ex');
        });

        it('uses query variable order when query is provided', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const query = 'SELECT ?b ?a WHERE { ?b ?a ?c }';
            const binding = new Map([
                [{ termType: 'Variable', value: 'a' }, { termType: 'NamedNode', value: 'http://example.org/a' }],
                [{ termType: 'Variable', value: 'b' }, { termType: 'NamedNode', value: 'http://example.org/b' }],
            ]);
            const result = await serializer.serializeBindings(
                makeContext(query) as any,
                asyncGen(binding) as any,
                token as any
            );
            // Parsed columns from query: b comes before a
            expect(result.columns.indexOf('b')).toBeLessThan(result.columns.indexOf('a'));
        });
    });

    describe('serializeQuads', () => {
        it('returns empty string for empty quad stream', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const result = await serializer.serializeQuads(
                makeContext() as any,
                asyncGen() as any,
                token as any
            );
            expect(result).toBe('');
        });

        it('returns Turtle string for a quad', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/subject'),
                DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                DataFactory.namedNode('http://example.org/Type'),
                DataFactory.defaultGraph()
            );
            const result = await serializer.serializeQuads(
                makeContext() as any,
                asyncGen(quad) as any,
                token as any
            );
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('http://example.org/subject');
        });

        it('uses prefix map when prefix service resolves prefixes', async () => {
            const prefixService = {
                getPrefixForIri: (_docIri: string, iri: string, _default: string) => {
                    if (iri === 'http://example.org/') return 'ex';
                    if (iri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#') return 'rdf';
                    return '';
                },
            };
            const serializer = new SparqlResultSerializer(prefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/subject'),
                DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                DataFactory.namedNode('http://example.org/Type'),
                DataFactory.defaultGraph()
            );
            const result = await serializer.serializeQuads(
                makeContext() as any,
                asyncGen(quad) as any,
                token as any
            );
            expect(result).toContain('ex:');
        });
    });

    describe('serializeQuadsToString', () => {
        it('returns empty string for empty quads array', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const result = await serializer.serializeQuadsToString([]);
            expect(result).toBe('');
        });

        it('returns Turtle string for quads without namespace map', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/s'),
                DataFactory.namedNode('http://example.org/p'),
                DataFactory.namedNode('http://example.org/o'),
                DataFactory.defaultGraph()
            );
            const result = await serializer.serializeQuadsToString([quad]);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('http://example.org/s');
        });

        it('uses provided namespace map for prefixes', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/subject'),
                DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                DataFactory.namedNode('http://example.org/Type'),
                DataFactory.defaultGraph()
            );
            const namespaces = { 'ex': 'http://example.org/', 'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' };
            const result = await serializer.serializeQuadsToString([quad], namespaces);
            expect(result).toContain('ex:');
        });

        it('handles multiple quads', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quads = [
                DataFactory.quad(
                    DataFactory.namedNode('http://example.org/a'),
                    DataFactory.namedNode('http://example.org/p'),
                    DataFactory.namedNode('http://example.org/b'),
                ),
                DataFactory.quad(
                    DataFactory.namedNode('http://example.org/c'),
                    DataFactory.namedNode('http://example.org/p'),
                    DataFactory.namedNode('http://example.org/d'),
                ),
            ];
            const result = await serializer.serializeQuadsToString(quads);
            expect(result).toContain('http://example.org/a');
            expect(result).toContain('http://example.org/c');
        });
    });
});
