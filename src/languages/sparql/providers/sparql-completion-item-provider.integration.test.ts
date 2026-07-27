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
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { ISparqlConnectionRegistry, IDocumentConnectionService, IGraphManagementService } from '@src/languages/sparql/services';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import {
    createTurtleDocument,
    createSparqlDocument,
    createMockDocumentContextService,
    createMockTextDocument,
    createTestVocabulary,
} from '@src/utilities/mocks/factories';

/**
 * End-to-end regression tests for local part completion in SPARQL queries.
 *
 * Unlike the unit tests, these tests run the REAL lexer through the full
 * provider pipeline: document text → context.tokenize() → token lookup at the
 * cursor position → triple component detection → namespace resolution →
 * prefix filtering → completion list assembly. They protect the fundamental
 * completion flow against regressions in any of these stages.
 */

const NEXUS = 'http://example.org/nexus#';

/**
 * Builds a real Turtle document context for an ontology defining `classCount`
 * filler classes (ClassA, ClassB, …) plus `nexus:SparePartStorageFacility`,
 * two properties (`nexus:hasPart`, `nexus:name`) and one named individual
 * (`nexus:factory1`). The subjects index is populated by the real tokenizer
 * via setTokens().
 */
function makeOntologyContext(classCount = 15): TurtleDocument {
    let source = `@prefix nexus: <${NEXUS}> .\n`;
    source += '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n';
    source += '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n';

    for (let i = 0; i < classCount; i++) {
        source += `nexus:Class${String.fromCharCode(65 + i)} a rdfs:Class .\n`;
    }

    source += 'nexus:SparePartStorageFacility a rdfs:Class .\n';
    source += 'nexus:hasPart a rdf:Property .\n';
    source += 'nexus:name a rdf:Property .\n';
    source += 'nexus:factory1 a nexus:SparePartStorageFacility .\n';

    const context = createTurtleDocument('file:///w/nexus.ttl');
    context.setTokens(context.tokenize(source));

    return context;
}

/** The property IRIs defined by {@link makeOntologyContext}. */
const ONTOLOGY_PROPERTIES = [`${NEXUS}hasPart`, `${NEXUS}name`];

/** The individual IRIs defined by {@link makeOntologyContext}. */
const ONTOLOGY_INDIVIDUALS = [`${NEXUS}factory1`];

/**
 * Builds a real SPARQL document context from the query source and a document
 * stub whose cursor position sits at the end of the source.
 */
function makeQuery(source: string) {
    const uri = vscode.Uri.parse('file:///w/query.sparql');
    const context = createSparqlDocument(uri);

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

function makeProvider(queryContext: SparqlDocument, ontologyContext: TurtleDocument): SparqlCompletionItemProvider {
    const provider = new SparqlCompletionItemProvider(
        createMockDocumentContextService(),
        createTestVocabulary(),
        connectionRegistry,
        documentConnectionService,
        graphService
    );

    (provider as any)._contextService = ({
        getDocumentContext: () => queryContext,
        getDocumentContextFromUri: (uri: string) => uri === NEXUS ? ontologyContext : null,
        contexts: { 'file:///w/nexus.ttl': ontologyContext },
    });
    (provider as any)._vocabulary = ({
        getProperties: () => ONTOLOGY_PROPERTIES,
        // Everything in the generated ontology except the properties and
        // individuals is declared as a class.
        getClasses: () => Object.keys(ontologyContext.subjects)
            .filter(iri => !ONTOLOGY_PROPERTIES.includes(iri) && !ONTOLOGY_INDIVIDUALS.includes(iri)),
        // 'name' has a literal range → data property; 'hasPart' has none → object property.
        getRange: (_graphs: any, iri: string) => iri === `${NEXUS}name` ? 'http://www.w3.org/2001/XMLSchema#string' : undefined,
        getDatatype: () => undefined,
    });

    return provider;
}

/** Shared invocation arguments for provideCompletionItems. */
const cancellationToken = new vscode.CancellationTokenSource().token;
const completionContext: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

describe('SparqlCompletionItemProvider (integration, real lexer)', () => {
    it('indexes the ontology subjects via the real tokenizer', () => {
        const ontology = makeOntologyContext();

        expect(Object.keys(ontology.subjects)).toContain(`${NEXUS}SparePartStorageFacility`);
        expect(Object.keys(ontology.subjects).length).toBeGreaterThan(15);
    });

    it('suggests a class whose local part is partially typed in a type assertion', async () => {
        // The user regression: `?s a nexus:SparePartStor` must suggest SparePartStorageFacility.
        const ontology = makeOntologyContext();
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:SparePartStor`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(result).toBeInstanceOf(vscode.CompletionList);
        expect(result.items.some((i: any) => i.label === 'SparePartStorageFacility')).toBe(true);
        // All matches fit into the list — no re-query needed.
        expect(result.isIncomplete).toBe(false);
        // Classes are rendered with the class symbol icon in the completion widget.
        const item = result.items.find((i: any) => i.label === 'SparePartStorageFacility');
        expect(item?.kind).toBe(vscode.CompletionItemKind.Class);
    });

    it('marks the broad result at the prefix trigger as incomplete so VS Code re-queries while typing', async () => {
        // At `nexus:` every subject in the namespace matches and the list is truncated.
        // isIncomplete must be true — otherwise VS Code only filters the initial items
        // client-side and matches beyond the cut-off can never appear.
        const ontology = makeOntologyContext();
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(result.items).toHaveLength(provider.maxCompletionItems);
        expect(result.isIncomplete).toBe(true);
        // The target sorts after the truncation cut-off here — this is exactly why
        // the incomplete flag is required for it to surface on the narrowed re-query.
        expect(result.items.some((i: any) => i.label === 'SparePartStorageFacility')).toBe(false);
    });

    it('does not suggest classes from the ontology when the prefix is not declared in the query', async () => {
        const ontology = makeOntologyContext();
        const { context, document, position } = makeQuery(
            'SELECT * WHERE { ?s a nexus:SparePartStor'
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(result.items).toHaveLength(0);
    });

    it('matches the typed local part case-insensitively', async () => {
        const ontology = makeOntologyContext();
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:sparepartstor`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(result.items.some((i: any) => i.label === 'SparePartStorageFacility')).toBe(true);
    });

    it('returns the completion items sorted by label', async () => {
        const ontology = makeOntologyContext(3);
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:Class`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;
        const labels = result.items.map((i: any) => i.label);

        expect(labels).toEqual(['ClassA', 'ClassB', 'ClassC']);
    });

    it('ranks classes first in the object of a type assertion', async () => {
        // `?s a nexus:` — with more classes than list slots, every visible item
        // must be a class; properties and individuals rank below the cut-off.
        const ontology = makeOntologyContext();
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(result.items).toHaveLength(provider.maxCompletionItems);
        expect(result.items.every((i: any) => i.kind === vscode.CompletionItemKind.Class)).toBe(true);
        expect(result.items.some((i: any) => i.label === 'hasPart' || i.label === 'name' || i.label === 'factory1')).toBe(false);
    });

    it('suggests only properties in predicate position', async () => {
        // `{ ?s nexus:` — the variable was the subject, so the cursor is on the predicate.
        const ontology = makeOntologyContext();
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s nexus:`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;
        const labels = result.items.map((i: any) => i.label);

        expect(labels).toEqual(['hasPart', 'name']);
        // Object property (relation) vs. literal-valued data property icons.
        expect(result.items[0].kind).toBe(vscode.CompletionItemKind.Interface);
        expect(result.items[1].kind).toBe(vscode.CompletionItemKind.Field);
    });

    it('ranks classes and individuals before properties in object position', async () => {
        // `?s nexus:hasPart nexus:` — a plain (non-type) object position.
        const ontology = makeOntologyContext(2);
        const { context, document, position } = makeQuery(
            `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s nexus:hasPart nexus:`
        );
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;
        const labels = result.items.map((i: any) => i.label);

        // Classes and the individual share the top priority (locale-sorted by
        // label within it); the properties rank last.
        expect(labels).toEqual(['ClassA', 'ClassB', 'factory1', 'SparePartStorageFacility', 'hasPart', 'name']);
    });

    it('works for untitled documents where the graph IRI falls back to the document URI', async () => {
        const ontology = makeOntologyContext();
        const source = `PREFIX nexus: <${NEXUS}>\nSELECT * WHERE { ?s a nexus:SparePartStor`;
        const uri = vscode.Uri.parse('untitled:Untitled-1');
        const context = createSparqlDocument(uri);

        context.setTokens(context.tokenize(source));

        const document = createMockTextDocument(source, { uri, languageId: 'sparql' });
        const lines = source.split('\n');
        const position = new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
        const provider = makeProvider(context, ontology);

        const result = await provider.provideCompletionItems(document, position, cancellationToken, completionContext) as vscode.CompletionList;

        expect(result.items.some((i: any) => i.label === 'SparePartStorageFacility')).toBe(true);
    });
});
