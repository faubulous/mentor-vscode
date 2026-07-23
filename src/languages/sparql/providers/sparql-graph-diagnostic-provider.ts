import * as vscode from 'vscode';
import { IGraphManagementService, IDocumentConnectionService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/workspace-store';

/**
 * Matches the IRI value inside `FROM <…>`, `FROM NAMED <…>`, and `GRAPH <…>` clauses.
 * Group 1 captures the IRI string between the angle brackets.
 */
const GRAPH_IRI_RE = /\b(?:FROM\s+(?:NAMED\s+)?|GRAPH\s+)<([^>]+)>/gi;

/**
 * Produces `DiagnosticSeverity.Warning` diagnostics for graph IRIs referenced in a SPARQL
 * document that are not present in the cached graph list for the document's connection.
 *
 * Diagnostics are produced when a reliable graph list is available for the document's
 * connection, i.e. when either:
 * - the connection is the in-memory workspace store (its graph list is always available), or
 * - the connection has `autoLoadGraphs` enabled and the graph service has successfully
 *   loaded graphs at least once for it.
 */
export class SparqlGraphDiagnosticProvider implements vscode.Disposable {

    private readonly _collection: vscode.DiagnosticCollection;

    private readonly _subscriptions: vscode.Disposable[] = [];

    constructor(
        private readonly _documentConnectionService: IDocumentConnectionService,
        private readonly _graphService: IGraphManagementService
    ) {
        this._collection = vscode.languages.createDiagnosticCollection('sparql-graphs');

        this._subscriptions.push(
            this._collection,
            vscode.workspace.onDidOpenTextDocument(doc => this._validateIfSparql(doc)),
            vscode.workspace.onDidChangeTextDocument(e => this._validateIfSparql(e.document)),
            vscode.workspace.onDidCloseTextDocument(doc => this._collection.delete(doc.uri)),
        );

        // Re-validate open SPARQL documents whenever the graph cache changes.
        const graphService = this._graphService;

        this._subscriptions.push(
            graphService.onDidChangeGraphs(connectionId => this._revalidateForConnection(connectionId))
        );

        // Re-validate a document when its connection (or inference setting) changes, so graph
        // diagnostics are recomputed against the new source's graphs rather than the old set.
        this._subscriptions.push(
            this._documentConnectionService.onDidChangeConnectionForDocument(uri => this._revalidateDocument(uri))
        );

        // Validate all currently open SPARQL documents on startup.
        for (const doc of vscode.workspace.textDocuments) {
            this._validateIfSparql(doc);
        }
    }

    private _validateIfSparql(document: vscode.TextDocument): void {
        if (document.languageId === 'sparql') {
            this._validateDocument(document);
        }
    }

    private _revalidateDocument(uri: vscode.Uri): void {
        const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());

        if (document) {
            this._validateIfSparql(document);
        }
    }

    private _revalidateForConnection(connectionId: string): void {
        for (const doc of vscode.workspace.textDocuments) {
            if (doc.languageId !== 'sparql') {
                continue;
            }

            const connection = this._documentConnectionService.getConnectionForDocument(doc.uri);

            if (connection.id === connectionId) {
                this._validateDocument(doc);
            }
        }
    }

    private _validateDocument(document: vscode.TextDocument): void {
        const connection = this._documentConnectionService.getConnectionForDocument(document.uri);

        // Load the connection's graphs on demand when they are not cached yet or the
        // cached list's reload interval has been exceeded (e.g. after switching the
        // document to a connection that was not auto-loaded at startup). The load fires
        // onDidChangeGraphs on completion, which re-validates this document against the
        // freshly loaded set. Served from the cache when fresh; no-op when not eligible.
        void this._graphService.ensureGraphsLoadedForConnection(connection);

        // The in-memory workspace store always has a graph list (so it lints regardless of
        // the auto-load setting); a remote connection lints only when it auto-loads graphs
        // and a load has succeeded.
        const isWorkspace = connection.id === WORKSPACE_CONNECTION.id;
        const canValidate = this._graphService.hasGraphsForConnection(connection.id)
            && (isWorkspace || !!connection.autoLoadGraphs);

        if (!canValidate) {
            this._collection.delete(document.uri);
        } else {
            const knownGraphs = new Set(this._graphService.getGraphsForConnection(connection.id, this._documentConnectionService.getInferenceEnabledForDocument(document.uri)));
            const text = document.getText();
            const diagnostics: vscode.Diagnostic[] = [];

            let match: RegExpExecArray | null;
            GRAPH_IRI_RE.lastIndex = 0;

            while ((match = GRAPH_IRI_RE.exec(text)) !== null) {
                const iri = match[1];

                if (knownGraphs.has(iri)) {
                    continue;
                }

                const matchStart = match.index + match[0].indexOf('<') + 1;
                const startPos = document.positionAt(matchStart);
                const endPos = document.positionAt(matchStart + iri.length);
                const range = new vscode.Range(startPos, endPos);

                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Graph <${iri}> not found in the connected store`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.source = 'mentor';
                diagnostics.push(diagnostic);
            }

            this._collection.set(document.uri, diagnostics);
        }
    }

    dispose(): void {
        for (const sub of this._subscriptions) {
            sub.dispose();
        }
    }
}
