import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockStore } = vi.hoisted(() => ({
    mockStore: {
        reasoner: null as any,
        executeInference: vi.fn(),
        loadFromXmlStream: vi.fn(async () => {}),
    }
}));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn((token: string) => {
        if (token === 'Store') return mockStore;
        return {};
    }) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import * as vscode from 'vscode';
import { Uri } from '@src/utilities/mocks/vscode';
import { XmlDocument } from './xml-document';

beforeEach(() => {
    vi.clearAllMocks();
    mockStore.reasoner = null;
    (vscode.workspace as any).textDocuments = [];
});

/**
 * Minimal parse result for seeding XmlDocument state.
 */
function makeParseResult(overrides: Partial<Parameters<XmlDocument['setParsedData']>[0]> = {}): Parameters<XmlDocument['setParsedData']>[0] {
    return {
        baseIri: 'http://example.org/',
        namespaces: { ex: 'http://example.org/' },
        namespaceDefinitions: {},
        subjects: {},
        references: {},
        typeAssertions: {},
        typeDefinitions: {},
        textLiteralRanges: [],
        ...overrides,
    };
}

function makeDoc(uri = 'file:///test.xml'): XmlDocument {
    return new XmlDocument(Uri.parse(uri) as any);
}

describe('XmlDocument', () => {
    describe('hasTokens', () => {
        it('is false before setParsedData is called', () => {
            const doc = makeDoc();
            expect(doc.hasTokens).toBe(false);
        });

        it('is true after setParsedData is called', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            expect(doc.hasTokens).toBe(true);
        });
    });

    describe('setParsedData', () => {
        it('sets namespaces from the parse result', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult({ namespaces: { rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' } }));
            expect((doc as any).namespaces['rdf']).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
        });

        it('adds the implicit xml namespace when not already present', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult({ namespaces: {} }));
            expect((doc as any).namespaces['xml']).toBe('http://www.w3.org/XML/1998/namespace#');
        });

        it('preserves an explicit xml namespace when already defined', () => {
            const doc = makeDoc();
            const customXml = 'http://custom.org/xml#';
            doc.setParsedData(makeParseResult({ namespaces: { xml: customXml } }));
            expect((doc as any).namespaces['xml']).toBe(customXml);
        });

        it('stores baseIri from the parse result', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult({ baseIri: 'http://base.org/' }));
            expect((doc as any).baseIri).toBe('http://base.org/');
        });
    });

    describe('getIriFromXmlString', () => {
        function setupDoc(namespaces: Record<string, string>, baseIri = 'http://base.org/'): XmlDocument {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult({ namespaces, baseIri }));
            return doc;
        }

        it('resolves an entity reference (&prefix;localName) using namespaces', () => {
            const doc = setupDoc({ owl: 'http://www.w3.org/2002/07/owl#' });
            const iri = doc.getIriFromXmlString('&owl;Class');
            expect(iri).toBe('http://www.w3.org/2002/07/owl#Class');
        });

        it('returns undefined for an entity reference when prefix is not in namespaces', () => {
            const doc = setupDoc({});
            const iri = doc.getIriFromXmlString('&unknown;Class');
            expect(iri).toBeUndefined();
        });

        it('resolves a fragment value starting with # using baseIri', () => {
            const doc = setupDoc({}, 'http://base.org/');
            const iri = doc.getIriFromXmlString('#Thing');
            expect(iri).toBe('http://base.org/#Thing');
        });

        it('resolves a bare local name (no colon) using baseIri', () => {
            const doc = setupDoc({}, 'http://base.org/');
            const iri = doc.getIriFromXmlString('Person');
            expect(iri).toBe('http://base.org/Person');
        });

        it('resolves a prefixed name using namespaces', () => {
            const doc = setupDoc({ ex: 'http://example.org/' });
            const iri = doc.getIriFromXmlString('ex:Person');
            expect(iri).toBe('http://example.org/Person');
        });

        it('returns the value as-is when the scheme/prefix is not in namespaces', () => {
            const doc = setupDoc({});
            const iri = doc.getIriFromXmlString('http://example.org/Person');
            expect(iri).toBe('http://example.org/Person');
        });

        it('returns baseIri for an empty string (falls through to no-colon branch)', () => {
            const doc = setupDoc({}, 'http://base.org/');
            const iri = doc.getIriFromXmlString('');
            expect(iri).toBe('http://base.org/');
        });
    });

    describe('isLoaded', () => {
        it('is false before setParsedData is called', () => {
            const doc = makeDoc();
            expect(doc.isLoaded).toBe(false);
        });

        it('is false after setParsedData but before graphs are populated', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            // _hasContent is true but graphs is still empty
            expect(doc.isLoaded).toBe(false);
        });

        it('is true when _hasContent is true and graphs has entries', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            (doc as any).graphs.push('urn:test-graph');
            expect(doc.isLoaded).toBe(true);
        });
    });

    describe('getAttributeNameRangeNearPosition', () => {
        function makeDocWithNs(): XmlDocument {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult({ namespaces: { rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' } }));
            return doc;
        }

        it('returns a range when position is within the attribute name', () => {
            const doc = makeDocWithNs();
            // 'rdf:type="http://example.org/Foo"' — cursor at char 3 (within 'rdf:type')
            const range = doc.getAttributeNameRangeNearPosition('  rdf:type="http://example.org/Foo"', { line: 0, character: 5 });
            expect(range).toBeDefined();
            // start should be at the start of 'rdf:type'
            expect(range?.start.character).toBe(2);
        });

        it('returns a range when position is within the attribute value', () => {
            const doc = makeDocWithNs();
            const line = '  rdf:type="http://example.org/Foo"';
            // cursor within the value
            const range = doc.getAttributeNameRangeNearPosition(line, { line: 0, character: 20 });
            expect(range).toBeDefined();
        });

        it('returns undefined when position is outside any attribute', () => {
            const doc = makeDocWithNs();
            const range = doc.getAttributeNameRangeNearPosition('<rdf:Description>', { line: 0, character: 2 });
            expect(range).toBeUndefined();
        });
    });

    describe('getAttributeValueRangeAtPosition', () => {
        function makeDocWithNs(): XmlDocument {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            return doc;
        }

        it('returns the range of the quoted value when cursor is within', () => {
            const doc = makeDocWithNs();
            const line = 'rdf:resource="http://example.org/Foo"';
            // cursor at char 15, well inside the quoted value
            const range = doc.getAttributeValueRangeAtPosition(line, { line: 0, character: 20 });
            expect(range).toBeDefined();
            // start should be at char 14 (after opening quote), end at 33
            expect(range?.start.character).toBe(14);
        });

        it('returns undefined when cursor is outside any quoted value', () => {
            const doc = makeDocWithNs();
            const range = doc.getAttributeValueRangeAtPosition('<rdf:Description>', { line: 0, character: 5 });
            expect(range).toBeUndefined();
        });

        it('returns undefined for an empty line', () => {
            const doc = makeDocWithNs();
            expect(doc.getAttributeValueRangeAtPosition('', { line: 0, character: 0 })).toBeUndefined();
        });
    });

    describe('getPrefixedNameRangeAtPosition', () => {
        it('returns the range when cursor is within a prefixed name', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            // '  rdfs:label="Test"' — cursor at char 4 inside 'rdfs:label'
            const range = doc.getPrefixedNameRangeAtPosition('  rdfs:label="Test"', { line: 0, character: 4 });
            expect(range).toBeDefined();
            expect(range?.start.character).toBe(2);
        });

        it('returns undefined when cursor is outside any prefixed name', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            const range = doc.getPrefixedNameRangeAtPosition('"http://example.org/"', { line: 0, character: 5 });
            expect(range).toBeUndefined();
        });

        it('returns undefined for an empty line', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            expect(doc.getPrefixedNameRangeAtPosition('', { line: 0, character: 0 })).toBeUndefined();
        });
    });

    describe('getEntityRangeAtPosition', () => {
        it('returns the range of the entity name when cursor is within', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            const line = '<!ENTITY owl "http://www.w3.org/2002/07/owl#">';
            // 'owl' starts at index 9 (after 'ENTITY ')
            const range = doc.getEntityRangeAtPosition(line, { line: 0, character: 10 });
            expect(range).toBeDefined();
            expect(range?.start.character).toBe(9);
        });

        it('returns undefined when cursor is outside the entity name', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            const line = '<!ENTITY owl "http://www.w3.org/2002/07/owl#">';
            const range = doc.getEntityRangeAtPosition(line, { line: 0, character: 15 });
            expect(range).toBeUndefined();
        });

        it('returns undefined for a line with no ENTITY declaration', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            expect(doc.getEntityRangeAtPosition('<rdf:Description>', { line: 0, character: 5 })).toBeUndefined();
        });
    });

    describe('getIriAtPosition', () => {
        it('returns undefined when no text document is registered', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            // getTextDocument() returns undefined; the method returns early
            const iri = doc.getIriAtPosition({ line: 0, character: 5 });
            expect(iri).toBeUndefined();
        });
    });

    describe('getLiteralAtPosition', () => {
        it('returns undefined when no text document is registered', () => {
            const doc = makeDoc();
            doc.setParsedData(makeParseResult({
                textLiteralRanges: [{ start: { line: 2, character: 5 }, end: { line: 2, character: 10 } }],
            }));
            const result = (doc as any).getLiteralAtPosition({ line: 2, character: 7 });
            expect(result).toBeUndefined();
        });

        it('returns the literal text when cursor is inside a text literal range', () => {
            const uriStr = 'file:///test.xml';
            const fakeDoc = {
                uri: { toString: () => uriStr },
                getText: vi.fn(() => 'hello'),
            };
            (vscode.workspace as any).textDocuments = [fakeDoc];

            const doc = makeDoc(uriStr);
            doc.setParsedData(makeParseResult({
                textLiteralRanges: [{ start: { line: 2, character: 5 }, end: { line: 2, character: 10 } }],
            }));

            const result = (doc as any).getLiteralAtPosition({ line: 2, character: 7 });
            expect(result).toBe('hello');
        });

        it('returns undefined when cursor is before a text literal range', () => {
            const uriStr = 'file:///test2.xml';
            const fakeDoc = {
                uri: { toString: () => uriStr },
                getText: vi.fn(() => 'hello'),
            };
            (vscode.workspace as any).textDocuments = [fakeDoc];

            const doc = makeDoc(uriStr);
            doc.setParsedData(makeParseResult({
                textLiteralRanges: [{ start: { line: 5, character: 0 }, end: { line: 5, character: 10 } }],
            }));

            // cursor on line 2, which is before line 5
            const result = (doc as any).getLiteralAtPosition({ line: 2, character: 0 });
            expect(result).toBeUndefined();
        });
    });

    describe('infer', () => {
        it('should not execute inference when reasoner is not set', async () => {
            mockStore.reasoner = null;
            const doc = makeDoc();
            await doc.infer();
            expect(mockStore.executeInference).not.toHaveBeenCalled();
        });

        it('should execute inference when reasoner is set and inference has not been run', async () => {
            mockStore.reasoner = {};
            const doc = makeDoc();
            doc.setParsedData(makeParseResult());
            (doc as any).graphs = ['urn:graph1'];
            await doc.infer();
            expect(mockStore.executeInference).toHaveBeenCalled();
        });

        it('should not execute inference more than once', async () => {
            mockStore.reasoner = {};
            const doc = makeDoc();
            (doc as any).graphs = ['urn:graph1'];
            await doc.infer();
            await doc.infer();
            expect(mockStore.executeInference).toHaveBeenCalledTimes(1);
        });
    });

    describe('loadTriples', () => {
        it('should call store.loadFromXmlStream with the document data', async () => {
            const doc = makeDoc('file:///rdf.xml');
            await doc.loadTriples('<rdf:RDF />');
            expect(mockStore.loadFromXmlStream).toHaveBeenCalledWith(
                '<rdf:RDF />',
                expect.any(String),
                false
            );
        });

        it('should handle errors gracefully when loadFromXmlStream throws', async () => {
            mockStore.loadFromXmlStream.mockRejectedValueOnce(new Error('parse error'));
            const doc = makeDoc('file:///bad.xml');
            await expect(doc.loadTriples('bad xml')).resolves.not.toThrow();
        });
    });
});
