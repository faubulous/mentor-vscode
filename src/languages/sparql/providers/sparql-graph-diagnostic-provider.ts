import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService, IGraphManagementService } from '@src/languages/sparql/services';

/**
 * Matches the IRI value inside `FROM <…>`, `FROM NAMED <…>`, and `GRAPH <…>` clauses.
 * Group 1 captures the IRI string between the angle brackets.
 */
const GRAPH_IRI_RE = /\b(?:FROM\s+(?:NAMED\s+)?|GRAPH\s+)<([^>]+)>/gi;

/**
 * Produces `DiagnosticSeverity.Warning` diagnostics for graph IRIs referenced in a SPARQL
 * document that are not present in the cached graph list for the document's connection.
 *
 * Diagnostics are only produced when:
 * - the connection has `autoLoadGraphs` enabled, and
 * - the graph service has successfully loaded graphs at least once for that connection.
 */
export class SparqlGraphDiagnosticProvider implements vscode.Disposable {

    private readonly _collection: vscode.DiagnosticCollection;

    private readonly _subscriptions: vscode.Disposable[] = [];

    private get _connectionService(): ISparqlConnectionService {
        return container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
    }

    private get _graphService(): IGraphManagementService {
        return container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);
    }

    constructor() {
        this._collection = vscode.languages.createDiagnosticCollection('sparql-graphs');

        this._subscriptions.push(
            this._collection,
            vscode.workspace.onDidOpenTextDocument(doc => this._validateIfSparql(doc)),
            vscode.workspace.onDidChangeTextDocument(e => this._validateIfSparql(e.document)),
            vscode.workspace.onDidCloseTextDocument(doc => this._collection.delete(doc.uri)),
        );

        // Re-validate open SPARQL documents whenever the graph cache changes.
        const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

        this._subscriptions.push(
            graphService.onDidChangeGraphs(connectionId => this._revalidateForConnection(connectionId))
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

    private _revalidateForConnection(connectionId: string): void {
        for (const doc of vscode.workspace.textDocuments) {
            if (doc.languageId !== 'sparql') {
                continue;
            }

            const connection = this._connectionService.getConnectionForDocument(doc.uri);

            if (connection.id === connectionId) {
                this._validateDocument(doc);
            }
        }
    }

    private _validateDocument(document: vscode.TextDocument): void {
        const connection = this._connectionService.getConnectionForDocument(document.uri);

        if (!connection.autoLoadGraphs || !this._graphService.hasGraphsForConnection(connection.id)) {
            this._collection.delete(document.uri);
        } else {
            const knownGraphs = new Set(this._graphService.getGraphsForConnection(connection.id, this._connectionService.getInferenceEnabledForDocument(document.uri)));
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
