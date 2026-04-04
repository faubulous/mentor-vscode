import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri } from '@src/utilities/mocks/vscode';
import { XmlDocument } from './xml-document';

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
});
