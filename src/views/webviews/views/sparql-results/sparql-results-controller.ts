import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry, ISparqlEndpointTester, ISparqlQueryService, ISparqlResultSerializer, IDocumentConnectionService, IGraphManagementService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-registry';
import { QuadsResult, SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { SparqlConnectionGraphStatus, SparqlResultsWebviewMessages } from './sparql-results-messages';
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
        const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
        const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

        // A history change is execution/mutation driven — select the latest query's
        // tab so a freshly run query's results come to the front.
        this.subscribe(queryService.onDidHistoryChange(() => this._postQueryHistory(true), this));

        // Keep the welcome view's connections column live: refresh the list when
        // connections change and mirror per-connection graph loading and counts.
        this.subscribe(connectionRegistry.onDidChangeConnections(this._postConnections, this));

        this.subscribe(graphService.onDidGraphLoadStart(connection => {
            this.postMessage({ id: 'SparqlConnectionGraphsLoading', connectionId: connection.id, loading: true });
        }));

        this.subscribe(graphService.onDidGraphLoadEnd(connection => {
            this.postMessage({ id: 'SparqlConnectionGraphsLoading', connectionId: connection.id, loading: false });
        }));

        this.subscribe(graphService.onDidChangeGraphs(connectionId => {
            this.postMessage({
                id: 'SparqlConnectionGraphsChanged',
                connectionId,
                status: this._getGraphStatus(connectionId),
            });
        }));
    }

    /**
     * Posts the query history to the webview.
     * @param selectLatest When `true` (an execution/mutation-driven push), the panel
     * brings the latest query's tab to the front. When `false` (a pull/refresh, e.g.
     * the welcome view requesting its history list), the panel updates its tabs without
     * changing the selected tab — so refreshing the list never steals the welcome tab.
     */
    private _postQueryHistory(selectLatest: boolean = false) {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

        this.postMessage({
            id: 'PostSparqlQueryHistory',
            history: queryService.getQueryHistory(),
            selectLatest
        });
    }

    /**
     * The graph-list status of a single connection, read from the graph service's cache.
     */
    private _getGraphStatus(connectionId: string): SparqlConnectionGraphStatus {
        const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

        if (connectionId === WORKSPACE_CONNECTION.id) {
            return { count: graphService.getWorkspaceGraphs(false).length };
        }

        const error = graphService.getGraphLoadError(connectionId);

        return {
            count: graphService.getGraphsForConnection(connectionId, false).length,
            ...(error !== undefined ? { error } : {}),
        };
    }

    /**
     * Posts the connection list and the cached graph statuses to the welcome view.
     * Connections without cached graphs and no load error carry no status entry.
     */
    private _postConnections() {
        const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
        const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

        const connections = connectionRegistry.getConnections();
        const statuses: Record<string, SparqlConnectionGraphStatus> = {};

        for (const connection of connections) {
            if (connection.id === WORKSPACE_CONNECTION.id
                || graphService.hasGraphsForConnection(connection.id)
                || graphService.getGraphLoadError(connection.id) !== undefined) {
                statuses[connection.id] = this._getGraphStatus(connection.id);
            }
        }

        this.postMessage({ id: 'PostSparqlConnections', connections, statuses });
    }

    protected async onDidReceiveMessage(message: SparqlResultsWebviewMessages): Promise<boolean> {
        switch (message.id) {
            case 'GetSparqlQueryHistory': {
                this._postQueryHistory();
                return true;
            }
            case 'GetSparqlConnections': {
                this._postConnections();
                return true;
            }
            case 'TestSparqlConnection': {
                const endpointTester = container.resolve<ISparqlEndpointTester>(ServiceToken.SparqlEndpointTester);

                const result = await endpointTester.testConnection(message.connection);

                this.postMessage({
                    id: 'TestSparqlConnectionResult',
                    connectionId: message.connection.id,
                    success: result === null,
                    error: result?.message,
                });

                return true;
            }
            case 'ListSparqlConnectionGraphs': {
                await this._handleListConnectionGraphs(message.connection);
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
     * Lists a connection's graphs in the results panel: the connection is tested first
     * so failures surface as a test result on the welcome view's connections column
     * instead of a failing background query.
     */
    private async _handleListConnectionGraphs(connection: SparqlConnection) {
        const endpointTester = container.resolve<ISparqlEndpointTester>(ServiceToken.SparqlEndpointTester);

        const testResult = await endpointTester.testConnection(connection);

        if (testResult !== null) {
            this.postMessage({
                id: 'TestSparqlConnectionResult',
                connectionId: connection.id,
                success: false,
                error: testResult.message,
            });

            return;
        }

        try {
            await vscode.commands.executeCommand('mentor.command.listGraphs', connection);
        } catch (e) {
            this.postMessage({
                id: 'TestSparqlConnectionResult',
                connectionId: connection.id,
                success: false,
                error: e instanceof Error ? e.message : String(e),
            });
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
     * Reveals the results panel on its welcome tab. Used by the status bar item,
     * which opens the panel as a hub rather than to inspect the last query: a
     * freshly created webview starts on the welcome tab anyway, and an already
     * running one is switched to it.
     */
    async showWelcome() {
        await this._ensurePanelVisible();

        this.postMessage({ id: 'ShowSparqlWelcome' });
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