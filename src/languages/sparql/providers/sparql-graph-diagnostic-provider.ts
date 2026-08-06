import * as vscode from 'vscode';
import { IGraphManagementService, IDocumentConnectionService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/workspace-store';
import { KeyedDebouncer } from '@src/utilities/debounce';

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

    /**
     * Debounces per-edit validation: each pass resolves the document connection
     * (a scan over open notebooks), probes the graph cache and sweeps the text,
     * which is too much to run on every keystroke.
     */
    private readonly _changeDebouncer = new KeyedDebouncer<string>(300);

    constructor(
        private readonly _documentConnectionService: IDocumentConnectionService,
        private readonly _graphService: IGraphManagementService
    ) {
        this._collection = vscode.languages.createDiagnosticCollection('sparql-graphs');

        this._subscriptions.push(
            this._collection,
            this._changeDebouncer,
            vscode.workspace.onDidOpenTextDocument(doc => this._validateIfSparql(doc)),
            vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.languageId === 'sparql') {
                    this._changeDebouncer.schedule(e.document.uri.toString(), () => this._validateIfSparql(e.document));
                }
            }),
            vscode.workspace.onDidCloseTextDocument(doc => {
                this._changeDebouncer.cancel(doc.uri.toString());
                this._collection.delete(doc.uri);
            }),
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

        // Safety net for the applyEdit/event-ordering race: the connection-change
        // event fires right after `applyEdit` resolves, which may be before the
        // extension host has applied the cell-metadata change — a revalidation at
        // that moment reads the old connection. The notebook event carries the
        // final metadata, so re-validate affected SPARQL cells from here as well
        // (debounced, so the two triggers coalesce into one pass).
        this._subscriptions.push(
            vscode.workspace.onDidChangeNotebookDocument(e => {
                for (const change of e.cellChanges) {
                    if (change.metadata !== undefined && change.cell.document.languageId === 'sparql') {
                        const cellDocument = change.cell.document;

                        this._changeDebouncer.schedule(cellDocument.uri.toString(), () => this._validateIfSparql(cellDocument));
                    }
                }
            })
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
        const key = uri.toString();
        const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === key);

        if (document) {
            if (document.languageId === 'sparql') {
                // An explicit connection change retries a previously failed graph
                // load, so the recovery via onDidChangeGraphs can fire.
                this._validateDocument(document, { retryOnError: true });
            }

            return;
        }

        // Defensive fan-out: a notebook-level notification carries the notebook
        // URI, which never matches a text document — cell documents do. Re-validate
        // the notebook's SPARQL cells instead of silently dropping the event.
        const notebook = vscode.workspace.notebookDocuments.find(nb => nb.uri.toString() === key);

        if (notebook) {
            for (const cell of notebook.getCells()) {
                if (cell.document.languageId === 'sparql') {
                    this._validateDocument(cell.document, { retryOnError: true });
                }
            }
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

    private _validateDocument(document: vscode.TextDocument, options?: { retryOnError?: boolean }): void {
        const connection = this._documentConnectionService.getConnectionForDocument(document.uri);

        // Load the connection's graphs on demand when they are not cached yet or the
        // cached list's reload interval has been exceeded (e.g. after switching the
        // document to a connection that was not auto-loaded at startup). The load fires
        // onDidChangeGraphs on completion, which re-validates this document against the
        // freshly loaded set. Served from the cache when fresh; no-op when not eligible.
        // `retryOnError` is only passed for explicit connection changes — never from
        // the per-edit path — so failing endpoints are not re-queried per keystroke.
        void this._graphService.ensureGraphsLoadedForConnection(connection, options);

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
