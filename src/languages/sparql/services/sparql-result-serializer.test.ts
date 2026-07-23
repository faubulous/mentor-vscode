import { describe, it, expect, vi, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { DataFactory } from 'n3';
import type { Literal, Quad } from '@rdfjs/types';
import { SparqlResultSerializer } from '@src/languages/sparql/services/sparql-result-serializer';

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
            expect((row['label'] as Literal).language).toBe('en');
            expect((row['label'] as Literal).datatype.termType).toBe('NamedNode');
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

        it('uses inference/default prefix when it matches a namespace IRI', async () => {
            // Cover lines 229-231: inner loop where prefixIri === iri
            const prefixService = {
                getPrefixForIri: (_d: any, _i: any, def: any) => def,
                getInferencePrefixes: () => ({ ex: 'http://example.org/' }),
                getDefaultPrefixes: () => ({}),
            };
            const serializer = new SparqlResultSerializer(prefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/subject'),
                DataFactory.namedNode('http://example.org/predicate'),
                DataFactory.namedNode('http://example.org/object'),
                DataFactory.defaultGraph()
            );
            const result = await serializer.serializeQuadsToString([quad]);
            // The prefix 'ex' matched 'http://example.org/' → result uses ex: prefix
            expect(result).toContain('ex:');
        });

        it('returns empty string and logs error when serialization throws', async () => {
            // Cover catch block lines 254-255: getInferencePrefixes throws (no namespaces arg path)
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const throwingPrefixService = {
                getPrefixForIri: (_d: any, _i: any, def: any) => def,
                getInferencePrefixes: () => { throw new Error('prefix error'); },
                getDefaultPrefixes: () => ({}),
            };
            const serializer = new SparqlResultSerializer(throwingPrefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/s'),
                DataFactory.namedNode('http://example.org/p'),
                DataFactory.namedNode('http://example.org/o'),
                DataFactory.defaultGraph()
            );
            const result = await serializer.serializeQuadsToString([quad]);
            expect(result).toBe('');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('serializeBindings - Quad termType', () => {
        it('serializes a Quad-termType value recursively', async () => {
            // Cover lines 60-63: the Quad branch in serializeTerm
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quadValue = DataFactory.quad(
                DataFactory.namedNode('http://example.org/s'),
                DataFactory.namedNode('http://example.org/p'),
                DataFactory.namedNode('http://example.org/o'),
                DataFactory.defaultGraph()
            );
            const binding = new Map([
                [{ termType: 'Variable', value: 'q' }, quadValue],
            ]);
            const result = await serializer.serializeBindings(
                makeContext() as any,
                asyncGen(binding) as any,
                token as any
            );
            const row = result.rows[0];
            expect(row['q'].termType).toBe('Quad');
            expect((row['q'] as Quad).subject).toBeDefined();
            expect((row['q'] as Quad).predicate).toBeDefined();
            expect((row['q'] as Quad).object).toBeDefined();
        });
    });

    describe('serializeQuads - error paths', () => {
        it('returns empty string and logs error when quad stream throws', async () => {
            // Cover catch block lines 178-179 by having the async stream throw
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            async function* throwingStream(): AsyncIterable<any> {
                throw new Error('stream error');
            }
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const result = await serializer.serializeQuads(
                makeContext() as any,
                throwingStream() as any,
                token as any
            );
            expect(result).toBe('');
            consoleSpy.mockRestore();
        });

    });

    describe('pretty printing', () => {
        const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
        const SH_NS = 'http://www.w3.org/ns/shacl#';

        it('emits @prefix directives', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/s'),
                DataFactory.namedNode('http://example.org/p'),
                DataFactory.namedNode('http://example.org/o'),
            );
            const result = await serializer.serializeQuadsToString([quad], { ex: 'http://example.org/' });
            expect(result).toContain('@prefix ex: <http://example.org/> .');
        });

        it('collapses duplicate quads into a single statement', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quad = () => DataFactory.quad(
                DataFactory.namedNode('http://example.org/s'),
                DataFactory.namedNode('http://example.org/p'),
                DataFactory.namedNode('http://example.org/o'),
            );
            const result = await serializer.serializeQuadsToString([quad(), quad()], { ex: 'http://example.org/' });
            expect(result.match(/ex:s ex:p ex:o/g)).toHaveLength(1);
        });

        it('serializes named-graph quads as plain triples', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const quad = DataFactory.quad(
                DataFactory.namedNode('http://example.org/s'),
                DataFactory.namedNode('http://example.org/p'),
                DataFactory.namedNode('http://example.org/o'),
                DataFactory.namedNode('http://example.org/graph')
            );
            const result = await serializer.serializeQuadsToString([quad], { ex: 'http://example.org/' });
            expect(result).toContain('ex:s ex:p ex:o');
        });

        it('serializes SHACL-style shapes with inline blank nodes and collections', async () => {
            const serializer = new SparqlResultSerializer(noPrefixService as any);
            const propertyShape = DataFactory.blankNode('13xf400_b0');
            const listHead = DataFactory.blankNode('13xf400_b1');
            const listTail = DataFactory.blankNode('13xf400_b2');

            const quads = [
                DataFactory.quad(
                    DataFactory.namedNode('http://example.org/shape'),
                    DataFactory.namedNode(`${SH_NS}property`),
                    propertyShape
                ),
                DataFactory.quad(propertyShape, DataFactory.namedNode(`${SH_NS}path`), listHead),
                DataFactory.quad(listHead, DataFactory.namedNode(`${RDF_NS}first`), DataFactory.namedNode('http://example.org/broader')),
                DataFactory.quad(listHead, DataFactory.namedNode(`${RDF_NS}rest`), listTail),
                DataFactory.quad(listTail, DataFactory.namedNode(`${RDF_NS}first`), DataFactory.namedNode('http://example.org/narrower')),
                DataFactory.quad(listTail, DataFactory.namedNode(`${RDF_NS}rest`), DataFactory.namedNode(`${RDF_NS}nil`)),
            ];

            const result = await serializer.serializeQuadsToString(quads, { ex: 'http://example.org/', sh: SH_NS });

            expect(result).toContain('sh:property [ sh:path ( ex:broader ex:narrower ) ]');
            expect(result).not.toContain('rdf:first');
            expect(result).not.toContain('13xf400');
        });

        describe('blankLinesBetweenSubjects setting', () => {
            const twoSubjects = [
                DataFactory.quad(
                    DataFactory.namedNode('http://example.org/a'),
                    DataFactory.namedNode('http://example.org/p'),
                    DataFactory.namedNode('http://example.org/x'),
                ),
                DataFactory.quad(
                    DataFactory.namedNode('http://example.org/b'),
                    DataFactory.namedNode('http://example.org/p'),
                    DataFactory.namedNode('http://example.org/y'),
                ),
            ];

            // Drives resolveFormattingConfig: mentor.formatting.common.blankLinesBetweenSubjects.
            const driveBlankLines = (value: boolean) => {
                (vscode.workspace as any).getConfiguration = vi.fn((section?: string) => ({
                    get: (key: string, defaultValue?: any) =>
                        (section === 'mentor.formatting.common' && key === 'blankLinesBetweenSubjects')
                            ? value
                            : defaultValue,
                    has: () => false,
                    inspect: () => undefined,
                    update: async () => {},
                }));
            };

            afterEach(() => {
                (vscode.workspace as any).getConfiguration = vi.fn(() => ({
                    get: (_k: string, def?: any) => def,
                    has: () => false,
                    inspect: () => undefined,
                    update: async () => {},
                }));
            });

            it('inserts a blank line between subjects when enabled', async () => {
                driveBlankLines(true);
                const serializer = new SparqlResultSerializer(noPrefixService as any);
                const result = await serializer.serializeQuadsToString(twoSubjects, { ex: 'http://example.org/' });
                expect(result).toContain('ex:a ex:p ex:x .\n\nex:b ex:p ex:y .');
            });

            it('omits the blank line between subjects when disabled', async () => {
                driveBlankLines(false);
                const serializer = new SparqlResultSerializer(noPrefixService as any);
                const result = await serializer.serializeQuadsToString(twoSubjects, { ex: 'http://example.org/' });
                expect(result).not.toContain('\n\nex:b');
                expect(result).toContain('ex:a ex:p ex:x .\nex:b ex:p ex:y .');
            });
        });

        describe('spaceBeforePunctuation setting', () => {
            const oneSubject = [
                DataFactory.quad(
                    DataFactory.namedNode('http://example.org/s'),
                    DataFactory.namedNode('http://example.org/p'),
                    DataFactory.namedNode('http://example.org/o'),
                ),
            ];

            const driveSpace = (value: boolean) => {
                (vscode.workspace as any).getConfiguration = vi.fn((section?: string) => ({
                    get: (key: string, defaultValue?: any) =>
                        (section === 'mentor.formatting.common' && key === 'spaceBeforePunctuation')
                            ? value
                            : defaultValue,
                    has: () => false,
                    inspect: () => undefined,
                    update: async () => {},
                }));
            };

            afterEach(() => {
                (vscode.workspace as any).getConfiguration = vi.fn(() => ({
                    get: (_k: string, def?: any) => def,
                    has: () => false,
                    inspect: () => undefined,
                    update: async () => {},
                }));
            });

            it('inserts a space before the statement terminator when enabled', async () => {
                driveSpace(true);
                const serializer = new SparqlResultSerializer(noPrefixService as any);
                const result = await serializer.serializeQuadsToString(oneSubject, { ex: 'http://example.org/' });
                expect(result).toContain('ex:s ex:p ex:o .');
                expect(result).toContain('@prefix ex: <http://example.org/> .');
            });

            it('hugs the statement terminator when disabled', async () => {
                driveSpace(false);
                const serializer = new SparqlResultSerializer(noPrefixService as any);
                const result = await serializer.serializeQuadsToString(oneSubject, { ex: 'http://example.org/' });
                expect(result).toContain('ex:s ex:p ex:o.');
                expect(result).toContain('@prefix ex: <http://example.org/>.');
            });
        });
    });
});
