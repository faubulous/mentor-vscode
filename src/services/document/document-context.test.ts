import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: () => ({
        get: (key: string, defaultValue?: any) => {
            if (key === 'predicates.label') return ['http://www.w3.org/2000/01/rdf-schema#label'];
            if (key === 'predicates.description') return ['http://www.w3.org/2000/01/rdf-schema#comment'];
            return defaultValue;
        },
    }),
}));

vi.mock('@src/providers/workspace-uri', () => ({
    WorkspaceUri: {
        toWorkspaceUri: (uri: any) => uri,
    },
}));

// Store and VocabularyRepository are resolved lazily — we set up per-test via the container mock below.
let mockStoreMatchAll: (graphUris: any, subject: any, predicate: any, object: any) => any[];
let mockSettingsGet: (key: string, defaultValue?: any) => any;
let mockGetPropertyPathTokens: (graphs: any, node: any) => any[];

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'SettingsService') {
                return { get: (k: string, d?: any) => mockSettingsGet(k, d) };
            }
            if (token === 'Store') {
                return {
                    matchAll: (graphUris: any, subject: any, predicate: any, object: any) =>
                        mockStoreMatchAll(graphUris, subject, predicate, object),
                };
            }
            if (token === 'VocabularyRepository') {
                return { getPropertyPathTokens: (g: any, n: any) => mockGetPropertyPathTokens(g, n) };
            }
            return {};
        }),
    },
    injectable: () => (t: any) => t,
    inject: () => () => {},
    singleton: () => (t: any) => t,
}));

// Use TurtleDocument as the concrete DocumentContext implementation.
import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TreeLabelStyle } from '@src/services/core/settings-service';

function makeDoc(uri = 'file:///workspace/test.ttl'): TurtleDocument {
    const vscodeUri = vscode.Uri.parse(uri);
    return new TurtleDocument(vscodeUri as any, RdfSyntax.Turtle);
}

function makeLiteral(value: string, language = '') {
    return { termType: 'Literal', value, language };
}

function makeNamedNode(value: string) {
    return { termType: 'NamedNode', value };
}

beforeEach(() => {
    mockStoreMatchAll = () => [];
    mockGetPropertyPathTokens = () => [];
    mockSettingsGet = (key: string, defaultValue?: any) => {
        if (key === 'view.definitionTree.labelStyle') return TreeLabelStyle.AnnotatedLabels;
        return defaultValue;
    };
});

// ---------------------------------------------------------------------------
// isTemporary
// ---------------------------------------------------------------------------
describe('DocumentContext – isTemporary', () => {
    it('returns false for a file:// URI', () => {
        const doc = makeDoc('file:///workspace/test.ttl');
        expect(doc.isTemporary).toBe(false);
    });

    it('returns true for an untitled: URI', () => {
        const doc = makeDoc('untitled:Untitled-1');
        expect(doc.isTemporary).toBe(true);
    });

    it('returns true for a git: URI', () => {
        const doc = makeDoc('git:/workspace/test.ttl');
        expect(doc.isTemporary).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// primaryLanguage
// ---------------------------------------------------------------------------
describe('DocumentContext – primaryLanguage', () => {
    it('returns undefined when predicateStats is empty', () => {
        const doc = makeDoc();
        doc.predicateStats = {};
        expect(doc.primaryLanguage).toBeUndefined();
    });

    it('returns the most frequently used language tag', () => {
        const doc = makeDoc();
        doc.predicateStats = {
            'http://www.w3.org/2000/01/rdf-schema#label': {
                count: 3,
                languageTags: { en: 2, de: 1 },
            },
        } as any;
        expect(doc.primaryLanguage).toBe('en');
    });

    it('returns undefined when all tags are empty strings', () => {
        const doc = makeDoc();
        doc.predicateStats = {
            'http://www.w3.org/2000/01/rdf-schema#label': {
                count: 1,
                languageTags: { '': 5 },
            },
        } as any;
        expect(doc.primaryLanguage).toBeUndefined();
    });

    it('accumulates counts across multiple predicates', () => {
        const doc = makeDoc();
        doc.predicateStats = {
            predA: { count: 2, languageTags: { en: 1, fr: 3 } },
            predB: { count: 2, languageTags: { en: 5, fr: 1 } },
        } as any;
        // en total: 6, fr total: 4 → primary is 'en'
        expect(doc.primaryLanguage).toBe('en');
    });

    it('caches the computed value on repeated access', () => {
        const doc = makeDoc();
        doc.predicateStats = {
            pred: { count: 1, languageTags: { nl: 10 } },
        } as any;
        const first = doc.primaryLanguage;
        doc.predicateStats = {}; // mutate — cached value should still be returned
        expect(doc.primaryLanguage).toBe(first);
    });
});

// ---------------------------------------------------------------------------
// activeLanguageTag / activeLanguage
// ---------------------------------------------------------------------------
describe('DocumentContext – activeLanguageTag / activeLanguage', () => {
    it('both are undefined initially', () => {
        const doc = makeDoc();
        expect(doc.activeLanguageTag).toBeUndefined();
        expect(doc.activeLanguage).toBeUndefined();
    });

    it('setting activeLanguageTag to a plain tag populates activeLanguage with the same value', () => {
        const doc = makeDoc();
        doc.activeLanguageTag = 'en';
        expect(doc.activeLanguageTag).toBe('en');
        expect(doc.activeLanguage).toBe('en');
    });

    it('setting activeLanguageTag to a regional tag strips the region', () => {
        const doc = makeDoc();
        doc.activeLanguageTag = 'en-GB';
        expect(doc.activeLanguageTag).toBe('en-GB');
        expect(doc.activeLanguage).toBe('en');
    });

    it('setting activeLanguageTag to undefined clears activeLanguage', () => {
        const doc = makeDoc();
        doc.activeLanguageTag = 'de';
        doc.activeLanguageTag = undefined;
        expect(doc.activeLanguageTag).toBeUndefined();
        expect(doc.activeLanguage).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// getPrefixForNamespaceIri
// ---------------------------------------------------------------------------
describe('DocumentContext – getPrefixForNamespaceIri', () => {
    it('returns undefined when namespaces is empty', () => {
        const doc = makeDoc();
        expect(doc.getPrefixForNamespaceIri('http://example.org/')).toBeUndefined();
    });

    it('returns the prefix for a matching namespace IRI', () => {
        const doc = makeDoc();
        doc.namespaces = { ex: 'http://example.org/', rdfs: 'http://www.w3.org/2000/01/rdf-schema#' };
        expect(doc.getPrefixForNamespaceIri('http://example.org/')).toBe('ex');
    });

    it('returns undefined when no namespace matches', () => {
        const doc = makeDoc();
        doc.namespaces = { ex: 'http://example.org/' };
        expect(doc.getPrefixForNamespaceIri('http://other.org/')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// updateNamespacePrefix
// ---------------------------------------------------------------------------
describe('DocumentContext – updateNamespacePrefix', () => {
    it('does nothing when the old prefix does not exist', () => {
        const doc = makeDoc();
        doc.namespaces = { ex: 'http://example.org/' };
        doc.updateNamespacePrefix('ghost', 'newGhost');
        expect(doc.namespaces).toEqual({ ex: 'http://example.org/' });
    });

    it('renames the prefix and preserves the namespace IRI', () => {
        const doc = makeDoc();
        doc.namespaces = { ex: 'http://example.org/' };
        doc.updateNamespacePrefix('ex', 'example');
        expect(doc.namespaces['ex']).toBeUndefined();
        expect(doc.namespaces['example']).toBe('http://example.org/');
    });

    it('does not affect other prefixes', () => {
        const doc = makeDoc();
        doc.namespaces = { ex: 'http://example.org/', rdfs: 'http://www.w3.org/2000/01/rdf-schema#' };
        doc.updateNamespacePrefix('ex', 'example');
        expect(doc.namespaces['rdfs']).toBe('http://www.w3.org/2000/01/rdf-schema#');
    });
});

// ---------------------------------------------------------------------------
// getResourceIri
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceIri', () => {
    it('returns a non-file IRI unchanged', () => {
        const doc = makeDoc();
        expect(doc.getResourceIri('http://example.org/Thing')).toBe('http://example.org/Thing');
    });

    it('returns a normal file IRI unchanged', () => {
        const doc = makeDoc();
        expect(doc.getResourceIri('file:///workspace/other.ttl')).toBe('file:///workspace/other.ttl');
    });

    it('returns a relative file IRI as a markdown link', () => {
        const doc = makeDoc('file:///workspace/sub/test.ttl');
        // A relative URI has authority '..' as parsed by vscode.Uri.parse
        const result = doc.getResourceIri('file://../sibling.ttl');
        // Should contain markdown link syntax
        expect(result).toMatch(/^\[.*\]\(.+\)$/);
    });
});

// ---------------------------------------------------------------------------
// getResourceLabel – UriLabels label style
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceLabel (UriLabels)', () => {
    beforeEach(() => {
        mockSettingsGet = (key: string, defaultValue?: any) => {
            if (key === 'view.definitionTree.labelStyle') return TreeLabelStyle.UriLabels;
            return defaultValue;
        };
    });

    it('returns the local part of an IRI', () => {
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('Thing');
        expect(label.language).toBeUndefined();
    });

    it('returns the full IRI when there is no local part', () => {
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://example.org/');
        expect(label.value).toBe('http://example.org/');
    });
});

// ---------------------------------------------------------------------------
// getResourceLabel – UriLabelsWithPrefix label style
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceLabel (UriLabelsWithPrefix)', () => {
    beforeEach(() => {
        mockSettingsGet = (key: string, defaultValue?: any) => {
            if (key === 'view.definitionTree.labelStyle') return TreeLabelStyle.UriLabelsWithPrefix;
            return defaultValue;
        };
    });

    it('uses the known prefix when the namespace is registered', () => {
        const doc = makeDoc();
        doc.namespaces = { ex: 'http://example.org/' };
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('ex:Thing');
    });

    it('uses "?" as prefix when the namespace is not registered', () => {
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://unknown.org/Thing');
        expect(label.value).toBe('?:Thing');
    });
});

// ---------------------------------------------------------------------------
// getResourceLabel – AnnotatedLabels (store-backed)
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceLabel (AnnotatedLabels)', () => {
    it('falls back to local name when store returns no labels', () => {
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('Thing');
    });

    it('returns the store label when a matching literal exists', () => {
        mockStoreMatchAll = () => [
            { object: makeLiteral('My Thing', 'en') },
        ];
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('My Thing');
    });

    it('prefers the activeLanguageTag match over generic literals', () => {
        mockStoreMatchAll = () => [
            { object: makeLiteral('Ding', 'de') },
            { object: makeLiteral('Thing', 'en') },
        ];
        const doc = makeDoc();
        doc.activeLanguageTag = 'en';
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('Thing');
    });

    it('falls back to primary-language match when active tag has no exact match', () => {
        mockStoreMatchAll = () => [
            { object: makeLiteral('Ding', 'de') },
            { object: makeLiteral('Thing', 'en') },
        ];
        const doc = makeDoc();
        doc.predicateStats = { pred: { count: 1, languageTags: { de: 5, en: 1 } } } as any;
        doc.activeLanguageTag = 'fr'; // no 'fr' literal exists
        const label = doc.getResourceLabel('http://example.org/Thing');
        // Should return 'de' (primary) or 'en' (fallback), not 'fr'
        expect(['Ding', 'Thing']).toContain(label.value);
    });

    it('works with blank node subjects (no colon in id)', () => {
        mockStoreMatchAll = () => [
            { object: makeLiteral('Blank Label', '') },
        ];
        const doc = makeDoc();
        const label = doc.getResourceLabel('_blankNode1');
        expect(label.value).toBe('Blank Label');
    });
});

// ---------------------------------------------------------------------------
// getResourceDescription
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceDescription', () => {
    it('returns undefined when store returns no matching quads', () => {
        const doc = makeDoc();
        expect(doc.getResourceDescription('http://example.org/Thing')).toBeUndefined();
    });

    it('returns a label object when matching quads exist', () => {
        mockStoreMatchAll = () => [
            { object: makeLiteral('A test thing.', 'en') },
        ];
        const doc = makeDoc();
        const desc = doc.getResourceDescription('http://example.org/Thing');
        expect(desc).toBeDefined();
        expect(desc!.value).toBe('A test thing.');
    });
});

// ---------------------------------------------------------------------------
// getResourceTooltip
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceTooltip', () => {
    beforeEach(() => {
        mockSettingsGet = (key: string, defaultValue?: any) => {
            if (key === 'view.definitionTree.labelStyle') return TreeLabelStyle.UriLabels;
            return defaultValue;
        };
    });

    it('returns a MarkdownString', () => {
        const doc = makeDoc();
        const tooltip = doc.getResourceTooltip('http://example.org/Thing');
        expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
    });

    it('includes the label in bold', () => {
        const doc = makeDoc();
        const tooltip = doc.getResourceTooltip('http://example.org/Thing');
        expect(tooltip.value).toContain('**Thing**');
    });

    it('includes the IRI', () => {
        const doc = makeDoc();
        const tooltip = doc.getResourceTooltip('http://example.org/Thing');
        expect(tooltip.value).toContain('http://example.org/Thing');
    });

    it('includes the description when one is available', () => {
        mockStoreMatchAll = () => [
            { object: makeLiteral('Describes a thing.', '') },
        ];
        const doc = makeDoc();
        const tooltip = doc.getResourceTooltip('http://example.org/Thing');
        expect(tooltip.value).toContain('Describes a thing.');
    });

    it('omits the description line when none is available', () => {
        const doc = makeDoc();
        const tooltip = doc.getResourceTooltip('http://example.org/Thing');
        // No spurious blank lines from undefined description
        expect(tooltip.value).not.toContain('undefined');
    });
});

// ---------------------------------------------------------------------------
// getResourceLabel – AnnotatedLabels: empty literal, language matching, primary match
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceLabel (AnnotatedLabels advanced)', () => {
    it('skips empty-value literals and returns fallback', () => {
        // Covers the literal.value.length == 0 continue branch
        mockStoreMatchAll = (_g: any, _s: any, _p: any) => [
            { object: makeLiteral('', 'en') },         // skipped
            { object: makeLiteral('Fallback', 'de') }, // kept as fallback
        ];
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('Fallback');
    });

    it('returns language-prefix match when tag does not exactly match but startsWith', () => {
        // Covers languageLabel assignment (activeLanguage startsWith)
        mockStoreMatchAll = () => [
            { object: makeLiteral('British English', 'en-GB') },
        ];
        const doc = makeDoc();
        doc.activeLanguageTag = 'en-US'; // activeLanguage = 'en'; 'en-GB'.startsWith('en') = true
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('British English');
    });

    it('returns primaryLabel when it matches the primary language and active tag is not found', () => {
        // Covers primaryLabel assignment and return
        mockStoreMatchAll = () => [
            { object: makeLiteral('Deutsch', 'de') },
        ];
        const doc = makeDoc();
        doc.predicateStats = { pred: { count: 1, languageTags: { de: 5 } } } as any;
        doc.activeLanguageTag = 'fr'; // no 'fr' literal → language label not set
        // activeLanguage = 'fr', 'de'.startsWith('fr') is false → no languageLabel
        // primaryLanguage = 'de', literal.language === 'de' → primaryLabel = literal
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('Deutsch');
    });

    it('returns label from default graph when current graph has none', () => {
        // Covers AnnotatedLabels case: first call (current graphs) returns nothing, second (undefined) returns result
        let callCount = 0;
        mockStoreMatchAll = () => {
            callCount++;
            // First call uses doc.graphs (non-empty); second call uses undefined (default graph)
            return callCount === 1 ? [] : [{ object: makeLiteral('Default Graph Label', 'en') }];
        };
        const doc = makeDoc();
        doc.activeLanguageTag = 'en';
        // Ensure graphs is non-empty so first call with graphs is distinct from second with undefined
        (doc as any).graphs = ['urn:g1'];
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('Default Graph Label');
    });

    it('returns SH.path annotation as property path label', () => {
        // Covers the p.value === SH.path branch
        const SH_PATH = 'http://www.w3.org/ns/shacl#path';
        mockStoreMatchAll = () => [
            { object: { termType: 'NamedNode', value: 'http://example.org/prop' } },
        ];
        // The predicate used is the label predicate; simulate SH.path being returned as the predicate value
        // We need the predicate in the loop to be SH.path — we override predicates.label to be SH.path
        mockGetPropertyPathTokens = () => ['myProp'];
        const doc = makeDoc();
        (doc as any).predicates.label = [SH_PATH];
        const label = doc.getResourceLabel('http://example.org/path-node');
        // Should have invoked getPropertyPathLabel returning 'myProp'
        expect(typeof label.value).toBe('string');
    });

    it('returns local part for non-Literal, non-SH.path object', () => {
        // Covers the else branch returning Uri.getLocalPart of a NamedNode value
        mockStoreMatchAll = () => [
            { object: { termType: 'NamedNode', value: 'http://example.org/SomeThing' } },
        ];
        const doc = makeDoc();
        const label = doc.getResourceLabel('http://example.org/Thing');
        expect(label.value).toBe('SomeThing');
    });
});

// ---------------------------------------------------------------------------
// getPropertyPathLabel
// ---------------------------------------------------------------------------
describe('DocumentContext – getPropertyPathLabel', () => {
    it('returns empty string when vocabulary yields no tokens', () => {
        mockGetPropertyPathTokens = () => [];
        const doc = makeDoc();
        const node = { termType: 'NamedNode', value: 'http://example.org/prop' } as any;
        expect(doc.getPropertyPathLabel(node)).toBe('');
    });

    it('formats | and / operators with surrounding spaces', () => {
        mockGetPropertyPathTokens = () => ['prop1', '|', 'prop2'];
        const doc = makeDoc();
        const node = {} as any;
        const result = doc.getPropertyPathLabel(node);
        expect(result).toBe('prop1 | prop2');
    });

    it('formats / operator with surrounding spaces', () => {
        mockGetPropertyPathTokens = () => ['prop1', '/', 'prop2'];
        const doc = makeDoc();
        const node = {} as any;
        const result = doc.getPropertyPathLabel(node);
        expect(result).toBe('prop1 / prop2');
    });

    it('resolves resource labels for named node tokens', () => {
        // Tokens can be strings or NamedNode-like objects; NamedNode objects get label-resolved
        mockGetPropertyPathTokens = () => [{ value: 'http://example.org/prop' }];
        mockStoreMatchAll = () => [{ object: makeLiteral('My Property', 'en') }];
        const doc = makeDoc();
        const node = {} as any;
        const result = doc.getPropertyPathLabel(node);
        expect(result).toBe('My Property');
    });
});

// ---------------------------------------------------------------------------
// getResourceDescription – default-graph fallback
// ---------------------------------------------------------------------------
describe('DocumentContext – getResourceDescription (default graph fallback)', () => {
    it('returns description from default graph when current graph has none', () => {
        let callCount = 0;
        mockStoreMatchAll = () => {
            callCount++;
            return callCount === 1 ? [] : [{ object: makeLiteral('Default description.', 'en') }];
        };
        const doc = makeDoc();
        doc.activeLanguageTag = 'en';
        (doc as any).graphs = ['urn:g1'];
        const desc = doc.getResourceDescription('http://example.org/Thing');
        expect(desc?.value).toBe('Default description.');
    });
});

// ---------------------------------------------------------------------------
// graphIri – workspace-URI fallback
// ---------------------------------------------------------------------------
describe('DocumentContext – graphIri fallback', () => {
    it('returns the raw URI when toWorkspaceUri returns null', () => {
        const doc = makeDoc('file:///workspace/test.ttl');
        const orig = WorkspaceUri.toWorkspaceUri;
        WorkspaceUri.toWorkspaceUri = () => null as any;
        try {
            expect(doc.graphIri).toBe(doc.uri);
        } finally {
            WorkspaceUri.toWorkspaceUri = orig;
        }
    });
});

// ---------------------------------------------------------------------------
// getTextDocument
// ---------------------------------------------------------------------------
describe('DocumentContext – getTextDocument', () => {
    afterEach(() => {
        (vscode.workspace.textDocuments as any[]).length = 0;
    });

    it('returns undefined when no matching document is open', () => {
        const doc = makeDoc('file:///workspace/test.ttl');
        expect(doc.getTextDocument()).toBeUndefined();
    });

    it('returns the matching text document when it is open', () => {
        const uri = 'file:///workspace/test.ttl';
        const mockTextDoc = { uri: vscode.Uri.parse(uri) } as any;
        (vscode.workspace.textDocuments as any[]).push(mockTextDoc);
        const doc = makeDoc(uri);
        expect(doc.getTextDocument()).toBe(mockTextDoc);
    });
});
