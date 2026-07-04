import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry, ISparqlQueryService, ISparqlResultSerializer, IDocumentConnectionService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-registry';
import { QuadsResult, SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';
import { IDocumentFactory } from '@src/services/document/document-factory.interface';

/**
 * A controller for the SPARQL results webview. It handles the registration of the webview, 
 * message passing, and execution of SPARQL queries.
 */
export class SparqlResultsController extends WebviewController<SparqlResultsWebviewMessages> {
    constructor() {
        super({
            viewType: 'mentor.view.sparqlResultsView',
            componentPath: 'sparql-results-panel.js',
        });

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

        this.subscribe(queryService.onDidHistoryChange(this._postQueryHistory, this));
    }

    private _postQueryHistory() {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

        this.postMessage({
            id: 'PostSparqlQueryHistory',
            history: queryService.getQueryHistory()
        });
    }

    protected async onDidReceiveMessage(message: SparqlResultsWebviewMessages): Promise<boolean> {
        switch (message.id) {
            case 'GetSparqlQueryHistory': {
                this._postQueryHistory();
                return true;
            }
            case 'EditBackgroundQuery': {
                await this._handleEditBackgroundQuery(message.queryId);
                return true;
            }
            case 'OpenRawResponse': {
                await this._handleOpenRawResponse(message.queryId);
                return true;
            }
            default:
                return super.onDidReceiveMessage(message);
        }
    }

    /**
     * Opens the query text of a background or generated query in a new editor, inheriting the
     * query's connection so it stays runnable. Background queries supply the connection via
     * `connectionId`; generated queries (e.g. rendered triplate templates) inherit it from the
     * source `documentIri` instead.
     * @param queryId The ID of the query execution whose query text should be opened.
     */
    private async _handleEditBackgroundQuery(queryId: string) {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.getQueryHistory().find(q => q.id === queryId);

        if (!queryState?.query) {
            return;
        }

        const document = await vscode.workspace.openTextDocument({
            content: queryState.query,
            language: 'sparql'
        });

        const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
        const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);

        // Resolve the connection from the explicit connectionId (background queries) or, for
        // generated queries, from the source document the query was rendered against.
        let connection: SparqlConnection | undefined;

        if (queryState.connectionId) {
            connection = connectionRegistry.getConnection(queryState.connectionId);
        } else if (queryState.documentIri) {
            const documentUri = vscode.Uri.parse(queryState.documentIri);

            connection = documentConnectionService.getConnectionForDocument(documentUri);
        }

        if (connection && connection.id !== WORKSPACE_CONNECTION.id) {
            await documentConnectionService.setQuerySourceForDocument(document.uri, connection.id);
        }

        this.postMessage({
            id: 'UpdateQueryDocumentIri',
            queryId,
            documentIri: document.uri.toString()
        });

        await vscode.window.showTextDocument(document);
    }

    /**
     * Opens the raw, unparsed HTTP response captured for a query in a new editor tab,
     * picking a syntax highlighting language from the response's content type.
     * @param queryId The ID of the query execution whose raw response should be shown.
     */
    private async _handleOpenRawResponse(queryId: string) {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.getQueryHistory().find(q => q.id === queryId);
        const rawResponse = queryState?.rawResponse;

        if (!rawResponse) {
            vscode.window.showInformationMessage('No raw response is available for this query.');
            return;
        }

        let language: string = "plaintext";

        if (rawResponse.contentType) {
            const documentFactory = container.resolve<IDocumentFactory>(ServiceToken.DocumentFactory);
            
            language = await documentFactory.getLanguageIdFromMimeType(rawResponse.contentType);
        }

        const document = await vscode.workspace.openTextDocument({
            content: rawResponse.body,
            language: language
        });

        await vscode.window.showTextDocument(document);
    }

    private async _prepareQueryExecution(queryContext: vscode.TextDocument | vscode.NotebookCell) {
        if ('uri' in queryContext && queryContext.uri.scheme === 'vscode-notebook-cell') {
            return;
        } else if (!this.view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        }
    }

    private async _executeQuery(queryState: SparqlQueryExecutionState) {
        if (this.view) {
            this.view.show();
        }

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const updatedState = await queryService.executeQuery(queryState);

        if (updatedState.result?.type === 'quads') {
            const result = updatedState.result as QuadsResult;
            const document = await vscode.workspace.openTextDocument({
                content: result.document,
                language: 'turtle'
            });

            await vscode.window.showTextDocument(document);
        }
    }

    /**
     * Executes a SPARQL query from a query string and a context document or notebook cell.
     * @param queryContext A text document or notebook cell from which to load the SPARQL endpoint.
     * @param query The SPARQL query string.
     * @param options Set `generated: true` when `query` was generated (e.g. rendered from a triplate
     * template) and differs from the context document's content, so "Edit query" reveals the query.
     */
    async executeQuery(queryContext: vscode.TextDocument | vscode.NotebookCell, query: string, options?: { isGenerated?: boolean }) {
        await this._prepareQueryExecution(queryContext);

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.createQuery(queryContext, query);
        queryState.isGenerated = options?.isGenerated;

        await this._executeQuery(queryState);
    }

    /**
     * Executes a SPARQL query from the contents of a text document or notebook cell.
     * @param queryContext The text document or notebook cell containing the SPARQL query.
     * @returns A promise that resolves when the query execution is complete.
     */
    async executeQueryFromTextDocument(queryContext: vscode.TextDocument | vscode.NotebookCell) {
        await this._prepareQueryExecution(queryContext);

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.createQueryFromDocument(queryContext);

        await this._executeQuery(queryState);
    }

    /**
     * Executes a SPARQL query in the background without opening an editor document.
     * The results panel is opened with a tab titled by the connection name.
     * @param connection The SPARQL connection to execute the query against.
     * @param query The SPARQL query string.
     * @param label A human-readable label for the query (e.g. 'List Graphs').
     */
    async executeBackgroundQuery(connection: SparqlConnection, query: string, label: string) {
        await this._ensurePanelVisible();

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.createBackgroundQuery(connection, query, label);

        await this._executeQuery(queryState);
    }

    /**
     * Displays an already-resolved list of named graphs in the results panel using the
     * standard bindings table, without executing the query. Used to surface graphs that
     * were already cached by the graph service.
     * @param connection The SPARQL connection the graphs belong to.
     * @param query The `listGraphs` query (kept on the tab so its Edit action still works).
     * @param graphs The cached named-graph IRIs to display.
     */
    async displayGraphList(connection: SparqlConnection, query: string, graphs: string[]) {
        await this._ensurePanelVisible();

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const serializer = container.resolve<ISparqlResultSerializer>(ServiceToken.SparqlQueryResultSerializer);

        const queryState = queryService.createBackgroundQuery(connection, query, 'List Graphs');
        queryState.result = serializer.serializeIriList(query, graphs);

        queryService.registerCompletedQuery(queryState);
    }

    /**
     * Ensures the results panel is visible, opening or revealing it as needed.
     */
    private async _ensurePanelVisible() {
        if (!this.view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        } else {
            this.view.show();
        }
    }
}