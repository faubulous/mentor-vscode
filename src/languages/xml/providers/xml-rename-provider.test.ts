import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Position, Range, Uri } from '@src/utilities/mocks/vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockGetDocumentContext } = vi.hoisted(() => ({
    mockGetDocumentContext: vi.fn(),
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'DocumentContextService') return { getDocumentContext: mockGetDocumentContext };
            return {};
        }),
    },
    injectable: () => (_target: any) => _target,
    inject: () => (_target: any, _key: any, _index: any) => {},
    singleton: () => (_target: any) => _target,
}));

vi.mock('@src/services/tokens', () => ({
    ServiceToken: { DocumentContextService: 'DocumentContextService' },
}));

import { XmlRenameProvider } from './xml-rename-provider';

beforeEach(() => {
    mockGetDocumentContext.mockReset();
});

function makeDocument(content: string) {
    const lines = content.split('\n');
    return {
        uri: Uri.parse('file:///test.rdf'),
        getText: (range?: Range) => {
            if (!range) return content;
            // Extract text for a single-line range
            const line = lines[range.start.line] ?? '';
            return line.slice(range.start.character, range.end.character);
        },
        positionAt: (offset: number) => {
            let cur = 0;
            for (let i = 0; i < lines.length; i++) {
                const lineLen = lines[i].length + 1;
                if (cur + lineLen > offset) {
                    return new Position(i, offset - cur);
                }
                cur += lineLen;
            }
            return new Position(lines.length - 1, lines[lines.length - 1].length);
        },
        lineAt: (line: number) => ({ text: lines[line] ?? '' }),
    };
}

describe('XmlRenameProvider', () => {
    let provider: XmlRenameProvider;

    beforeEach(() => {
        provider = new XmlRenameProvider();
    });

    describe('getWorkspaceEdits', () => {
        it('returns empty edits when no replacements are given', () => {
            const doc = makeDocument('<rdf:RDF />') as any;
            const edits = provider.getWorkspaceEdits(doc, []);
            expect(edits.size).toBe(0);
        });

        it('applies a single regex replacement', () => {
            const content = 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"';
            const doc = makeDocument(content) as any;
            const replacement = { fromExpression: /xmlns:rdf/g, toValue: 'xmlns:owl' };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(1);
            const entries = (edits as any).entries as any[];
            expect(entries[0].newText).toBe('xmlns:owl');
        });

        it('applies multiple occurrences of the same pattern', () => {
            const content = 'rdf:type rdf:about rdf:resource';
            const doc = makeDocument(content) as any;
            const replacement = { fromExpression: /rdf:/g, toValue: 'owl:' };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(3);
            const entries = (edits as any).entries as any[];
            expect(entries.every((e: any) => e.newText === 'owl:')).toBe(true);
        });

        it('applies multiple different replacements', () => {
            const content = 'xmlns:ex="http://example.org/" ex:foo ex:bar';
            const doc = makeDocument(content) as any;
            const replacements = [
                { fromExpression: /xmlns:ex/g, toValue: 'xmlns:myns' },
                { fromExpression: /ex:/g, toValue: 'myns:' },
            ];
            const edits = provider.getWorkspaceEdits(doc, replacements);
            expect(edits.size).toBe(3);
        });

        it('produces correct position ranges for replacements', () => {
            const content = 'rdf:type\nrdf:about';
            const doc = makeDocument(content) as any;
            const replacement = { fromExpression: /rdf/g, toValue: 'owl' };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(2);
            const entries = (edits as any).entries as any[];
            expect(entries[0].range.start.line).toBe(0);
            expect(entries[0].range.start.character).toBe(0);
            expect(entries[0].range.end.character).toBe(3);
            expect(entries[1].range.start.line).toBe(1);
            expect(entries[1].range.start.character).toBe(0);
        });

        it('returns empty edits when pattern has no matches', () => {
            const content = '<owl:Class />';
            const doc = makeDocument(content) as any;
            const replacement = { fromExpression: /rdf:/g, toValue: 'owl:' };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(0);
        });
    });

    describe('provideRenameEdits', () => {
        it('returns undefined when no document context', () => {
            mockGetDocumentContext.mockReturnValue(null);
            const doc = makeDocument('<rdf:RDF />') as any;
            const result = provider.provideRenameEdits(doc, new Position(0, 0), 'newName');
            expect(result).toBeUndefined();
        });

        it('returns empty edits when position is not in any name range or prefix range', () => {
            mockGetDocumentContext.mockReturnValue({
                getIriAtPosition: vi.fn(() => null),
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
                namespaces: {},
            });
            const doc = makeDocument('<rdf:RDF />') as any;
            const result = provider.provideRenameEdits(doc, new Position(0, 0), 'newName');
            expect(result).toBeDefined();
        });

        it('returns undefined when nameRange contains position but getIriAtPosition returns null', () => {
            const nameRange = new Range(new Position(0, 4), new Position(0, 10));
            const position = new Position(0, 6);

            mockGetDocumentContext.mockReturnValue({
                getIriAtPosition: vi.fn(() => null),
                getPrefixedNameRangeAtPosition: vi.fn(() =>
                    new Range(new Position(0, 0), new Position(0, 12))
                ),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
                namespaces: {},
            });

            // Line text: "rdf:about"
            const doc = makeDocument('rdf:about   ') as any;

            // Make _getLocalNameEditRange return the nameRange that contains the position
            const partialProvider = provider as any;
            partialProvider._getLocalNameEditRange = vi.fn(() => nameRange);

            const result = provider.provideRenameEdits(doc, position, 'newName');
            expect(result).toBeUndefined();
        });

        it('returns workspace edits when nameRange contains position and IRI is found', () => {
            const nameRange = new Range(new Position(0, 4), new Position(0, 11));
            const position = new Position(0, 7);
            const iri = 'http://example.org/Example';

            mockGetDocumentContext.mockReturnValue({
                getIriAtPosition: vi.fn(() => iri),
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
                namespaces: { ex: 'http://example.org/' },
                getPrefixForNamespaceIri: vi.fn(() => 'ex'),
                baseIri: null,
            });

            const content = '<ex:Example rdf:about="ex:Example"/>';
            const doc = makeDocument(content) as any;

            const partialProvider = provider as any;
            partialProvider._getLocalNameEditRange = vi.fn(() => nameRange);

            const result = provider.provideRenameEdits(doc, position, 'NewExample');
            expect(result).toBeDefined();
        });

        it('returns undefined when prefixRange contains position but namespace is not defined', () => {
            const prefixRange = new Range(new Position(0, 0), new Position(0, 3));
            const position = new Position(0, 2);

            mockGetDocumentContext.mockReturnValue({
                getIriAtPosition: vi.fn(() => null),
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
                namespaces: {},
            });

            const doc = makeDocument('rdf:type') as any;
            const partialProvider = provider as any;
            partialProvider._getLocalNameEditRange = vi.fn(() => null);
            partialProvider._getPrefixEditRange = vi.fn(() => prefixRange);
            doc.getText = vi.fn((r?: any) => r ? 'rdf' : 'rdf:type');

            const result = provider.provideRenameEdits(doc, position, 'owl');
            expect(result).toBeUndefined();
        });

        it('returns workspace edits when prefixRange contains position and namespace is defined', () => {
            const prefixRange = new Range(new Position(0, 0), new Position(0, 3));
            const position = new Position(0, 2);

            mockGetDocumentContext.mockReturnValue({
                getIriAtPosition: vi.fn(() => null),
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
                namespaces: { rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
            });

            const content = 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" rdf:type rdf:about';
            const doc = makeDocument(content) as any;
            const partialProvider = provider as any;
            partialProvider._getLocalNameEditRange = vi.fn(() => null);
            partialProvider._getPrefixEditRange = vi.fn(() => prefixRange);
            doc.getText = vi.fn((r?: any) => r ? 'rdf' : content);

            const result = provider.provideRenameEdits(doc, position, 'owl');
            expect(result).toBeDefined();
        });
    });

    describe('_getPrefixEditRange', () => {
        it('returns undefined when no document context', () => {
            mockGetDocumentContext.mockReturnValue(null);
            const doc = makeDocument('') as any;
            const result = (provider as any)._getPrefixEditRange(doc, new Position(0, 0));
            expect(result).toBeUndefined();
        });

        it('returns prefix range after xmlns: when prefixedName starts with xmlns:', () => {
            // Line: xmlns:ex="http://example.org/"
            // Position at char 6 (inside "ex")
            const line = 'xmlns:ex="http://example.org/"';
            const position = new Position(0, 7);
            // prefixedNameRange covers 'xmlns:ex' (char 0 to 8)
            const prefixedNameRange = new Range(new Position(0, 0), new Position(0, 8));

            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => prefixedNameRange),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
            });

            const doc = makeDocument(line) as any;

            const result = (provider as any)._getPrefixEditRange(doc, position);
            expect(result).toBeDefined();
            // Start should be after 'xmlns:' (6 chars), at char 6
            expect(result.start.character).toBe(6);
            expect(result.end.character).toBe(8);
        });

        it('returns prefix range up to colon when prefixedName does not start with xmlns:', () => {
            // Line: rdf:about
            // prefixedNameRange covers 'rdf:about' (char 0 to 9)
            const line = 'rdf:about';
            const position = new Position(0, 1);
            const prefixedNameRange = new Range(new Position(0, 0), new Position(0, 9));

            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => prefixedNameRange),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => null),
            });

            const doc = makeDocument(line) as any;

            const result = (provider as any)._getPrefixEditRange(doc, position);
            expect(result).toBeDefined();
            // Starts at char 0, ends at the colon index (3 = 'rdf'.length)
            expect(result.start.character).toBe(0);
            expect(result.end.character).toBe(3);
        });

        it('returns range for entity reference starting with & in attribute value', () => {
            const line = 'rdf:about="&ex;#Example"';
            const position = new Position(0, 13);
            const attrValueRange = new Range(new Position(0, 11), new Position(0, 16));
            // getText(&ex;#...) = '&ex;#Example' but we need 'attributeValue.startsWith(&)' = true
            // attrValue = '&ex;'

            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => attrValueRange),
                getEntityRangeAtPosition: vi.fn(() => null),
            });

            const doc = makeDocument(line) as any;
            doc.getText = vi.fn((r?: Range) => {
                if (!r) return line;
                if (r.start.character === 11 && r.end.character === 16) return '&ex;#';
                return '';
            });

            const result = (provider as any)._getPrefixEditRange(doc, position);
            expect(result).toBeDefined();
        });

        it('returns entityRange as fallback when no prefixed name or attribute value', () => {
            const position = new Position(0, 5);
            const entityRange = new Range(new Position(0, 4), new Position(0, 8));

            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
                getEntityRangeAtPosition: vi.fn(() => entityRange),
            });

            const doc = makeDocument('    &ex;') as any;
            const result = (provider as any)._getPrefixEditRange(doc, position);
            expect(result).toEqual(entityRange);
        });
    });

    describe('_getLocalNameEditRange', () => {
        it('returns undefined when no document context', () => {
            mockGetDocumentContext.mockReturnValue(null);
            const doc = makeDocument('') as any;
            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 0));
            expect(result).toBeUndefined();
        });

        it('returns undefined when no prefixed name range and no attribute value range', () => {
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
            });

            const doc = makeDocument('<rdf:RDF />') as any;
            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 5));
            expect(result).toBeUndefined();
        });

        it('returns local part range for non-xmlns, non-xml prefixed names', () => {
            // prefixedName = 'rdf:about', range starts at char 0, colon at index 3
            const prefixedNameRange = new Range(new Position(0, 0), new Position(0, 9));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => prefixedNameRange),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
            });

            const doc = makeDocument('rdf:about') as any;
            // getText returns 'rdf:about' for the range
            doc.getText = vi.fn((r?: Range) => r ? 'rdf:about' : 'rdf:about');

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 5));
            expect(result).toBeDefined();
            // Start should be after ':' (char 3+1 = 4), end should be end of range (9)
            expect(result.start.character).toBe(4);
            expect(result.end.character).toBe(9);
        });

        it('returns null/undefined when prefixedName starts with xmlns: or xml:', () => {
            // xmlns: prefixed name should skip local-part extraction and proceed to attribute value check
            const prefixedNameRange = new Range(new Position(0, 0), new Position(0, 10));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => prefixedNameRange),
                getAttributeValueRangeAtPosition: vi.fn(() => null),
            });

            const doc = makeDocument('xmlns:open') as any;
            doc.getText = vi.fn((r?: Range) => r ? 'xmlns:open' : 'xmlns:open');

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 7));
            expect(result).toBeUndefined();
        });

        it('returns range inside entity reference in attribute value', () => {
            // attributeValue = '&ex;Example' → entity ref
            const attrValueRange = new Range(new Position(0, 11), new Position(0, 22));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => attrValueRange),
            });

            const line = 'rdf:about="&ex;Example"';
            const doc = makeDocument(line) as any;
            doc.getText = vi.fn((r?: Range) => r ? '&ex;Example' : line);

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 16));
            expect(result).toBeDefined();
        });

        it('returns attribute value range for non-IRI local name in rdf:about', () => {
            // attributeValue = 'Example' (no colon) and attributeName = 'rdf:about'
            const attrValueRange = new Range(new Position(0, 11), new Position(0, 18));
            const attrNameRange = new Range(new Position(0, 1), new Position(0, 10));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => attrValueRange),
                getAttributeNameRangeNearPosition: vi.fn(() => attrNameRange),
            });

            const line = ' rdf:about="Example"';
            const doc = makeDocument(line) as any;
            doc.getText = vi.fn((r?: Range) => {
                if (!r) return line;
                if (r.start.character === 11) return 'Example';  // attribute value
                if (r.start.character === 1) return 'rdf:about'; // attribute name
                return '';
            });

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 14));
            expect(result).toEqual(attrValueRange);
        });

        it('returns IRI local name range for colon-containing attribute value in rdf:about', () => {
            // attributeValue = 'http://example.org/Example' (contains colon)
            const attrValueRange = new Range(new Position(0, 11), new Position(0, 37));
            const attrNameRange = new Range(new Position(0, 1), new Position(0, 10));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => attrValueRange),
                getAttributeNameRangeNearPosition: vi.fn(() => attrNameRange),
            });

            const line = ' rdf:about="http://example.org/Example"';
            const doc = makeDocument(line) as any;
            doc.getText = vi.fn((r?: Range) => {
                if (!r) return line;
                if (r.start.character === 11) return 'http://example.org/Example';
                if (r.start.character === 1) return 'rdf:about';
                return '';
            });

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 32));
            expect(result).toBeDefined();
        });

        it('returns undefined for attribute not in rdf:about, rdf:resource, rdf:datatype', () => {
            const attrValueRange = new Range(new Position(0, 11), new Position(0, 24));
            const attrNameRange = new Range(new Position(0, 1), new Position(0, 10));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => attrValueRange),
                getAttributeNameRangeNearPosition: vi.fn(() => attrNameRange),
            });

            const line = ' rdf:type   ="owl:Class"';
            const doc = makeDocument(line) as any;
            doc.getText = vi.fn((r?: Range) => {
                if (!r) return line;
                if (r.start.character === 11) return 'owl:Class';  // attribute value
                if (r.start.character === 1) return 'rdf:type';    // attribute name (not in allowed list)
                return '';
            });

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 14));
            expect(result).toBeUndefined();
        });

        it('returns undefined for IRI attribute value with no local name', () => {
            // An IRI ending in '/' has no local name → Uri.getLocalPart returns undefined
            const attrValueRange = new Range(new Position(0, 11), new Position(0, 34));
            const attrNameRange = new Range(new Position(0, 1), new Position(0, 10));
            mockGetDocumentContext.mockReturnValue({
                getPrefixedNameRangeAtPosition: vi.fn(() => null),
                getAttributeValueRangeAtPosition: vi.fn(() => attrValueRange),
                getAttributeNameRangeNearPosition: vi.fn(() => attrNameRange),
            });

            // IRI with colon but trailing '/' → getLocalPart returns undefined
            const attributeValue = 'http://example.org/';
            const line = ` rdf:about="${attributeValue}"`;
            const doc = makeDocument(line) as any;
            doc.getText = vi.fn((r?: Range) => {
                if (!r) return line;
                if (r.start.character === 11) return attributeValue;
                if (r.start.character === 1) return 'rdf:about';
                return '';
            });

            const result = (provider as any)._getLocalNameEditRange(doc, new Position(0, 14));
            expect(result).toBeUndefined();
        });
    });

    describe('_getPrefixTextReplacements', () => {
        it('returns empty array when prefix is not in context namespaces', () => {
            const context = { namespaces: {} } as any;
            const result = (provider as any)._getPrefixTextReplacements(context, 'ex', 'newPrefix');
            expect(result).toEqual([]);
        });

        it('returns 4 replacements for a valid prefix', () => {
            const context = { namespaces: { ex: 'http://example.org/' } } as any;
            const result = (provider as any)._getPrefixTextReplacements(context, 'ex', 'myns');
            expect(result).toHaveLength(4);
            expect(result[0].toValue).toBe('xmlns:myns');
            expect(result[1].toValue).toBe('myns:');
            expect(result[2].toValue).toBe('ENTITY myns');
            expect(result[3].toValue).toBe('&myns;');
        });

        it('replacement expressions match their targets in document text', () => {
            const context = { namespaces: { rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' } } as any;
            const [r0, r1, r2, r3] = (provider as any)._getPrefixTextReplacements(context, 'rdf', 'owl');
            expect('xmlns:rdf="..."'.match(r0.fromExpression)).toBeTruthy();
            expect('rdf:type'.match(r1.fromExpression)).toBeTruthy();
            expect('ENTITY rdf http://...'.match(r2.fromExpression)).toBeTruthy();
            expect('&rdf;'.match(r3.fromExpression)).toBeTruthy();
        });
    });

    describe('_getLocalNameTextReplacements', () => {
        it('returns empty array when IRI does not contain a colon', () => {
            const context = { namespaces: {}, getPrefixForNamespaceIri: vi.fn(), baseIri: null } as any;
            const result = (provider as any)._getLocalNameTextReplacements(context, 'noColon', 'foo');
            expect(result).toEqual([]);
        });

        it('returns IRI replacement when no prefix found', () => {
            const context = {
                namespaces: {},
                getPrefixForNamespaceIri: vi.fn(() => null),
                baseIri: null,
            } as any;
            const result = (provider as any)._getLocalNameTextReplacements(context, 'http://example.org/Example', 'NewExample');
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].toValue).toContain('NewExample');
        });

        it('returns IRI + prefix + entity replacements when prefix is found', () => {
            const context = {
                namespaces: { ex: 'http://example.org/' },
                getPrefixForNamespaceIri: vi.fn(() => 'ex'),
                baseIri: null,
            } as any;
            const result = (provider as any)._getLocalNameTextReplacements(context, 'http://example.org/Example', 'NewExample');
            // Should have: iri replacement, prefix:localPart, &prefix;localPart
            expect(result.length).toBe(3);
            expect(result[1].toValue).toBe('ex:NewExample');
            expect(result[2].toValue).toBe('&ex;NewExample');
        });

        it('includes baseIri replacement when IRI starts with baseIri', () => {
            const context = {
                namespaces: {},
                getPrefixForNamespaceIri: vi.fn(() => null),
                baseIri: 'http://example.org/',
            } as any;
            const result = (provider as any)._getLocalNameTextReplacements(context, 'http://example.org/Example', 'NewExample');
            const hasBaseIriReplace = result.some((r: any) => r.toValue === `="NewExample"`);
            expect(hasBaseIriReplace).toBe(true);
        });
    });
});
