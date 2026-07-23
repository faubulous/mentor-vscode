import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';

const env = vi.hoisted(() => ({
    collections: [] as any[],
    visibleTextEditors: [] as any[],
    textDocuments: [] as any[],
    diagnoseFiles: true,
    // Handler-capture slots: the vscode mock below stores the subscribed
    // event handlers here so tests can fire the events directly.
    fireVisibleEditorsChanged: undefined as ((e: unknown) => void) | undefined,
    fireDocumentClosed: undefined as ((e: unknown) => void) | undefined,
    fireFilesDeleted: undefined as ((e: unknown) => void) | undefined,
    fireFilesRenamed: undefined as ((e: unknown) => void) | undefined,
    fireConfigurationChanged: undefined as ((e: unknown) => void) | undefined,
}));

vi.mock('vscode', async () => {
    const base = await import('@src/utilities/mocks/vscode');
    return {
        ...base,
        languages: {
            ...base.languages,
            createDiagnosticCollection: (name?: string) => {
                const collection = { name, set: vi.fn(), delete: vi.fn(), clear: vi.fn(), dispose: vi.fn() };
                env.collections.push(collection);
                return collection;
            },
        },
        window: {
            ...base.window,
            get visibleTextEditors() { return env.visibleTextEditors; },
            onDidChangeVisibleTextEditors: (handler: any) => {
                env.fireVisibleEditorsChanged = handler;
                return { dispose: () => { } };
            },
        },
        workspace: {
            ...base.workspace,
            get textDocuments() { return env.textDocuments; },
            getConfiguration: () => ({
                get: (key: string, defaultValue?: any) =>
                    key === 'index.diagnoseFiles' ? env.diagnoseFiles : defaultValue,
            }),
            onDidCloseTextDocument: (handler: any) => {
                env.fireDocumentClosed = handler;
                return { dispose: () => { } };
            },
            onDidDeleteFiles: (handler: any) => {
                env.fireFilesDeleted = handler;
                return { dispose: () => { } };
            },
            onDidRenameFiles: (handler: any) => {
                env.fireFilesRenamed = handler;
                return { dispose: () => { } };
            },
            onDidChangeConfiguration: (handler: any) => {
                env.fireConfigurationChanged = handler;
                return { dispose: () => { } };
            },
        },
    };
});

import * as vscode from 'vscode';
import { DocumentDiagnosticsService } from '@src/services/document/document-diagnostics-service';
import { TokenDelivery } from '@src/services/document/document-token-source.interface';

/**
 * Creates a document stub with a real offset → position conversion so the
 * diagnostics functions produce meaningful ranges.
 */
function makeDocument(uri: string, text: string) {
    return {
        uri: vscode.Uri.parse(uri),
        getText: () => text,
        positionAt: (offset: number) => {
            const clamped = Math.max(0, Math.min(offset, text.length));
            const before = text.slice(0, clamped);
            const line = (before.match(/\n/g) ?? []).length;
            const character = clamped - (before.lastIndexOf('\n') + 1);
            return { line, character };
        },
    } as any;
}

function makeTurtleContext() {
    return { providesTokens: true, syntax: RdfSyntax.Turtle } as any;
}

function makeSparqlContext() {
    return { providesTokens: true, syntax: RdfSyntax.Sparql } as any;
}

function makeSetup(contextsByUri: Record<string, any>) {
    const deliveryEmitter = new vscode.EventEmitter<TokenDelivery>();
    const tokenSource = { onDidDeliverTokens: deliveryEmitter.event } as any;
    const service = new DocumentDiagnosticsService(tokenSource, uri => contextsByUri[uri]);
    const collection = env.collections[env.collections.length - 1];

    return {
        service,
        collection,
        deliverTokens: (uri: string) => deliveryEmitter.fire({ uri, tokens: [], consumed: false }),
    };
}

const VALID_TURTLE = '@prefix ex: <http://example.org/> .\nex:subject ex:predicate ex:object .';
const INVALID_TURTLE = '@prefix ex: <http://example.org/> .\nex:subject ex:predicate ;';
// Junk appended to an IRI in object position: the lexer skips the junk and the
// remaining tokens still parse, so only the lexer error surfaces the problem.
const LEXER_ERROR_TURTLE = '@prefix ex: <http://example.org/> .\nex:s ex:p <http://example.org/o>www .';

describe('DocumentDiagnosticsService', () => {
    beforeEach(() => {
        env.collections.length = 0;
        env.visibleTextEditors.length = 0;
        env.textDocuments.length = 0;
        env.diagnoseFiles = true;
    });

    it('publishes no diagnostics for a valid visible document', () => {
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        deliverTokens(uri);

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('publishes parse error diagnostics for an invalid visible document', () => {
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, INVALID_TURTLE);
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        deliverTokens(uri);

        const diagnostics = collection.set.mock.calls.at(-1)![1];
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].severity).toBe(0); // vscode.DiagnosticSeverity.Error
    });

    it('publishes lexer error diagnostics when invalid characters are skipped but the rest still parses', () => {
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, LEXER_ERROR_TURTLE);
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        deliverTokens(uri);

        const diagnostics = collection.set.mock.calls.at(-1)![1];
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].severity).toBe(0); // vscode.DiagnosticSeverity.Error

        // The range points at the skipped "www" (line 1, characters 32-35).
        const { range } = diagnostics[0];
        expect(range.start.line).toBe(1);
        expect(range.start.character).toBe(32);
        expect(range.end.line).toBe(1);
        expect(range.end.character).toBe(35);
    });

    it('publishes lexer error diagnostics for SPARQL when trailing characters are skipped', () => {
        const uri = 'file:///query.sparql';
        // "www" is skipped by the lexer; the remaining tokens form a complete query.
        const document = makeDocument(uri, 'SELECT * WHERE { ?s ?p ?o . }www');
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: makeSparqlContext() });

        deliverTokens(uri);

        const diagnostics = collection.set.mock.calls.at(-1)![1];
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].severity).toBe(0); // vscode.DiagnosticSeverity.Error

        // The range points at the skipped "www" (line 0, characters 29-32).
        const { range } = diagnostics[0];
        expect(range.start.line).toBe(0);
        expect(range.start.character).toBe(29);
        expect(range.end.character).toBe(32);
    });

    it('validates loaded but invisible documents by default (workspace overview)', () => {
        const uri = 'file:///invisible.ttl';
        const document = makeDocument(uri, VALID_TURTLE);
        env.textDocuments.push(document);

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        // The document is loaded (e.g. by the indexer) but not visible.
        deliverTokens(uri);

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('skips invisible documents when index.diagnoseFiles is disabled', () => {
        env.diagnoseFiles = false;

        const uri = 'file:///invisible.ttl';
        env.textDocuments.push(makeDocument(uri, VALID_TURTLE));

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        deliverTokens(uri);

        expect(collection.set).not.toHaveBeenCalled();
    });

    it('validates visible documents when index.diagnoseFiles is disabled', () => {
        env.diagnoseFiles = false;

        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        deliverTokens(uri);

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('diagnoses RDF/XML documents via the local XML parser', () => {
        const uri = 'file:///test.rdf';
        const document = makeDocument(uri, '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/>');
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: { providesTokens: false } });

        deliverTokens(uri);

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('validates documents when they become visible', () => {
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });

        expect(collection.set).not.toHaveBeenCalled();

        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });
        env.fireVisibleEditorsChanged!(env.visibleTextEditors);

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('validates already visible editors at construction time', () => {
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('clears empty documents without running the parser', () => {
        const uri = 'file:///empty.ttl';
        const document = makeDocument(uri, '');
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        deliverTokens(uri);

        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('keeps diagnostics when an indexed document is garbage-collected (closed)', () => {
        // VS Code closes documents opened by the indexer shortly after loading;
        // the workspace-wide problems overview must survive that.
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });

        env.fireDocumentClosed!(document);

        expect(collection.delete).not.toHaveBeenCalled();
    });

    it('removes diagnostics on close when validation is scoped to visible editors', () => {
        env.diagnoseFiles = false;

        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });

        env.fireDocumentClosed!(document);

        expect(collection.delete).toHaveBeenCalledWith(document.uri);
    });

    it('removes diagnostics when an untitled document is discarded', () => {
        const uri = 'untitled:Untitled-1';
        const document = makeDocument(uri, VALID_TURTLE);

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });

        env.fireDocumentClosed!(document);

        expect(collection.delete).toHaveBeenCalledWith(document.uri);
    });

    it('removes diagnostics when a file is deleted', () => {
        const uri = 'file:///deleted.ttl';
        const document = makeDocument(uri, VALID_TURTLE);

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });

        env.fireFilesDeleted!({ files: [document.uri] });

        expect(collection.delete).toHaveBeenCalledWith(document.uri);
    });

    it('removes diagnostics for the old URI when a file is renamed', () => {
        const oldDocument = makeDocument('file:///old.ttl', VALID_TURTLE);
        const newDocument = makeDocument('file:///new.ttl', VALID_TURTLE);

        const { collection } = makeSetup({});

        env.fireFilesRenamed!({ files: [{ oldUri: oldDocument.uri, newUri: newDocument.uri }] });

        expect(collection.delete).toHaveBeenCalledWith(oldDocument.uri);
    });

    it('clears all diagnostics and re-validates visible editors when the scope setting changes', () => {
        const uri = 'file:///test.ttl';
        const document = makeDocument(uri, VALID_TURTLE);
        env.textDocuments.push(document);
        env.visibleTextEditors.push({ document });

        const { collection } = makeSetup({ [uri]: makeTurtleContext() });
        collection.set.mockClear();

        env.fireConfigurationChanged!({ affectsConfiguration: (key: string) => key === 'mentor.index.diagnoseFiles' });

        expect(collection.clear).toHaveBeenCalled();
        expect(collection.set).toHaveBeenCalledWith(document.uri, []);
    });

    it('disposes the collection and unsubscribes on dispose', () => {
        const uri = 'file:///test.ttl';

        const { service, collection, deliverTokens } = makeSetup({ [uri]: makeTurtleContext() });

        service.dispose();

        expect(collection.dispose).toHaveBeenCalled();

        // Deliveries after disposal must not publish diagnostics.
        env.visibleTextEditors.push({ document: makeDocument(uri, VALID_TURTLE) });
        deliverTokens(uri);

        expect(collection.set).not.toHaveBeenCalled();
    });
});
