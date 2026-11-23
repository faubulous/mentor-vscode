import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Mock DI container — the provider getters are stubbed per test via vi.spyOn.
vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

// The turtle barrel re-exports the language clients which have circular imports
// with '@src/languages'. Re-export only the real TurtleDocument which is all the
// provider under test needs from the barrel.
vi.mock('@src/languages/turtle', async () => ({
    TurtleDocument: (await import('@src/languages/turtle/turtle-document')).TurtleDocument,
}));

import * as vscode from 'vscode';
import { SparqlCompletionItemProvider } from '@src/languages/sparql/providers/sparql-completion-item-provider';
import { SparqlDocument } from '@src/languages/sparql/sparql-document';
import { ISparqlConnectionRegistry, IDocumentConnectionService, IGraphManagementService } from '@src/languages/sparql/services';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { OwlReasoner, Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { IPrefixLookupService } from '@src/services/document/prefix-lookup-service.interface';
import { PredicateRangeResolver } from '@src/services/vocabulary/predicate-range-resolver';
import { PropertyShapeIndex } from '@src/services/vocabulary/property-shape-index';
import { StoreIconResolver } from '@src/services/vocabulary/store-icon-resolver';
import { TermCatalogueService } from '@src/services/vocabulary/term-catalogue-service';
import { TermFitResolver } from '@src/services/vocabulary/term-fit-resolver';
import { createSparqlDocument, createMockTextDocument } from '@src/utilities/mocks/factories';

/**
 * End-to-end tests of the completion of terms in SPARQL queries: the real lexer and document,
 * the place in the triple pattern read from the tokens, and the term catalogue the form editor's
 * pickers search too, over a store holding an ontology.
 */

const NEXUS = 'http://example.org/nexus#';

/**
 * A store holding an ontology of `classCount` filler classes (ClassA, ClassB, …), the class
 * `nexus:SparePartStorageFacility`, the properties `nexus:hasPart` (ranging over facilities) and
 * `nexus:name` (a string), and the facility `nexus:factory1`.
 * @param classCount The number of filler classes.
 * @returns The store.
 */
function makeOntologyStore(classCount = 15): Store {
    let source = `@prefix nexus: <${NEXUS}> .\n`;
    source += '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n';
    source += '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n';
    source += '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n';

    for (let i = 0; i < classCount; i++) {
        source += `nexus:Class${String.fromCharCode(65 + i)} a rdfs:Class .\n`;
    }

    source += 'nexus:SparePartStorageFacility a rdfs:Class .\n';
    source += 'nexus:hasPart a rdf:Property ; rdfs:range nexus:SparePartStorageFacility .\n';
    source += 'nexus:name a rdf:Property ; rdfs:range xsd:string .\n';
    source += 'nexus:factory1 a nexus:SparePartStorageFacility .\n';

    const store = new Store(new OwlReasoner());

    store.loadTurtle(source, 'file:///w/nexus.ttl', true);

    return store;
}

/**
 * A query over the store, with the cursor at the end of its text.
 * @param source The text of the query.
 * @param store The store.
 * @param uri The URI of the query.
 * @returns The document context, the text document and the position of the cursor.
 */
function makeQuery(source: string, store: Store, uri = vscode.Uri.parse('file:///w/query.sparql')) {
    const context = createSparqlDocument(uri, { store, vocabulary: new VocabularyRepository(store) });

    context.setTokens(context.tokenize(source));

    const document = createMockTextDocument(source, { uri, languageId: 'sparql' });
    const lines = source.split('\n');
    const position = new vscode.Position(lines.length - 1, lines[lines.length - 1].length);

    return { context, document, position };
}

/** A minimal saved connection for the no-op service stubs below. */
const stubConnection: SparqlConnection = {
    id: 'test-connection',
    endpointUrl: 'workspace:',
    configScope: ConfigurationScope.Workspace,
};

/** Typed no-op stub — the graph completion path is not exercised by these tests. */
const connectionRegistry: ISparqlConnectionRegistry = {
    onDidChangeConnections: new vscode.EventEmitter<void>().event,
    saveConfiguration: async () => { },
    getConnections: () => [],
    getConnectionsForConfigurationScope: () => [],
    getConnection: () => undefined,
    getInferenceEnabled: () => false,
    setInferenceEnabled: async () => { },
    toggleInferenceEnabled: async () => false,
    createConnection: async () => stubConnection,
    updateConnection: async () => { },
    saveConnectionWithCredential: async () => { },
    deleteConnection: async () => { },
};

/** Typed no-op stub — the graph completion path is not exercised by these tests. */
const documentConnectionService: IDocumentConnectionService = {
    onDidChangeConnectionForDocument: new vscode.EventEmitter<vscode.Uri>().event,
    getConnectionForDocument: () => stubConnection,
    getUnresolvedConnectionId: () => undefined,
    setQuerySourceForDocument: async () => { },
    setConnectionForCell: async () => { },
    setConnectionForNotebook: async () => [],
    setInferenceEnabledForNotebook: async () => [],
    notifyDocumentConnectionChanged: () => { },
    getInferenceEnabledForDocument: () => false,
    setInferenceEnabledForDocument: async () => { },
    toggleInferenceEnabledForDocument: async () => false,
    handleFileRenames: async () => { },
};

/** Typed no-op stub — the graph completion path is not exercised by these tests. */
const graphService: IGraphManagementService = {
    onDidChangeGraphs: new vscode.EventEmitter<string>().event,
    onDidGraphLoadStart: new vscode.EventEmitter<SparqlConnection>().event,
    onDidGraphLoadEnd: new vscode.EventEmitter<SparqlConnection>().event,
    notifyWorkspaceGraphsChanged: () => { },
    getWorkspaceGraphs: () => [],
    getGraphsForConnection: () => [],
    hasGraphsForConnection: () => false,
    getGraphLoadError: () => undefined,
    loadGraphsForConnection: async () => { },
    autoLoadConnections: async () => { },
    ensureGraphsLoadedForConnection: async () => { },
    dispose: () => { },
};

/**
 * The provider of a query over a store, with the term catalogue Mentor registers over it; the
 * workspace writes the ontology namespace as `nexus`, and declaring a prefix is recorded.
 * @param queryContext The context of the query.
 * @param store The store.
 * @returns The provider and the prefixes it declared.
 */
function makeProvider(queryContext: SparqlDocument, store: Store) {
    const prefixLookup = { getPrefixForIri: (_document: string, namespace: string, fallback: string) => namespace === NEXUS ? 'nexus' : fallback } as unknown as IPrefixLookupService;
    const shapes = new PropertyShapeIndex(store);
    const catalogue = new TermCatalogueService(new VocabularyRepository(store), prefixLookup, new StoreIconResolver(store), new PredicateRangeResolver(store, shapes), new TermFitResolver(store, shapes), () => Promise.resolve());
    const contextService = { isLoading: () => false, waitUntilLoaded: async () => { }, getDocumentContext: () => queryContext };
    const declared: string[] = [];
    const prefixEdits = async (_document: vscode.TextDocument, prefix: string, namespace: string) => {
        declared.push(`${prefix} ${namespace}`);

        return [vscode.TextEdit.insert(new vscode.Position(0, 0), `PREFIX ${prefix}: <${namespace}>\n`)];
    };
    const provider = new SparqlCompletionItemProvider(contextService as never, catalogue, connectionRegistry, documentConnectionService, graphService, prefixEdits);

    return { provider, declared };
}

/** Shared invocation arguments for provideCompletionItems. */
const cancellationToken = new vscode.CancellationTokenSource().token;
const completionContext: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

/**
 * Complete a query over an ontology at the end of its text.
 * @param source The text of the query.
 * @param store The store, with the ontology by default.
 * @returns The completion list and the prefixes declared.
 */
async function complete(source: string, store = makeOntologyStore()) {
    const { context, document, position } = makeQuery(source, store);
    const { provider, declared } = makeProvider(context, store);
    const list = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

    return { list, declared };
}

describe('SparqlCompletionItemProvider (integration, real lexer and catalogue)', () => {
    it('suggests a class whose local part is partially typed in a type assertion', async () => {
        const { list } = await complete(`PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:SparePartStor`);

        expect(list.items[0]).toMatchObject({ insertText: 'nexus:SparePartStorageFacility', kind: vscode.CompletionItemKind.Class });
        expect(list.isIncomplete).toBe(true);
    });

    it('offers only classes as the object of a type assertion', async () => {
        const { list } = await complete(`PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:`);
        const names = list.items.map(item => item.insertText);

        expect(names).toContain('nexus:SparePartStorageFacility');
        expect(names.some(name => name === 'nexus:hasPart' || name === 'nexus:name' || name === 'nexus:factory1')).toBe(false);
    });

    it('matches the typed name case-insensitively', async () => {
        const { list } = await complete(`PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:sparepartstor`);

        expect(list.items.map(item => item.insertText)).toContain('nexus:SparePartStorageFacility');
    });

    it('suggests only properties in predicate position, properties of literals as fields', async () => {
        const { list } = await complete(`PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s nexus:`);
        const kinds = Object.fromEntries(list.items.map(item => [item.insertText, item.kind]));

        expect(Object.keys(kinds).sort()).toEqual(['nexus:hasPart', 'nexus:name']);
        expect(kinds['nexus:name']).toBe(vscode.CompletionItemKind.Field);
    });

    it('ranks the instances of the range of the predicate first in object position', async () => {
        const { list } = await complete(`PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s nexus:hasPart nexus:`, makeOntologyStore(2));

        expect(list.items[0].insertText).toBe('nexus:factory1');
    });

    it('offers a term of an undeclared namespace for a bare word, and declares its prefix as it is accepted', async () => {
        const { list, declared } = await complete('SELECT * WHERE { ?s a SparePart');
        const facility = list.items.find(item => item.insertText === 'nexus:SparePartStorageFacility');

        expect(facility?.additionalTextEdits).toHaveLength(1);
        expect(declared).toContain(`nexus ${NEXUS}`);
    });

    it('works for untitled documents where the graph IRI falls back to the document URI', async () => {
        const store = makeOntologyStore();
        const { context, document, position } = makeQuery(`PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:SparePartStor`, store, vscode.Uri.parse('untitled:Untitled-1'));
        const { provider } = makeProvider(context, store);
        const list = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(list.items.map(item => item.insertText)).toContain('nexus:SparePartStorageFacility');
    });
});
