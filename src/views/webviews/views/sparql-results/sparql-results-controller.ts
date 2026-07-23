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
    /**
     * Resolves once a freshly opened webview has signaled it is listening (via its
     * first history request). Armed when the panel is opened and resolved when the
     * webview reports in, so query execution can wait for the panel to be ready
     * before it relies on the execution-driven history pushes that select the query's
     * tab. Without this, a query run while the panel is still mounting races the
     * mount and the pushes are dropped, leaving the tab visible but unselected.
     */
    private _webviewReady?: Promise<void>;

    private _resolveWebviewReady?: () => void;

    /**
     * The id of the query currently being executed, which the panel should select once its
     * result tab appears. Set for the duration of an execution and posted with every history
     * message so tab selection is independent of message ordering.
     */
    private _pendingSelectQueryId?: string;

    constructor() {
        super({
            viewType: 'mentor.view.sparqlResultsView',
            componentPath: 'sparql-results-panel.js',
        });

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
        const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

        // Any history post carries the pending selection (the query currently being
        // executed, if any), so the panel selects that query's tab as soon as it appears.
        this.subscribe(queryService.onDidHistoryChange(() => this._postQueryHistory(), this));

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
     * Posts the query history to the webview, carrying the pending tab selection.
     *
     * `selectQueryId` is the id of the query the panel should bring to front — set while a
     * query is executing (see {@link _executeQuery}) and `undefined` otherwise. Because it
     * rides on EVERY history post (both the execution-driven push and the webview's mount
     * pull), the panel selects that query's tab regardless of which message wins the race;
     * a refresh with no execution in flight carries `undefined` and never moves the tab.
     */
    private _postQueryHistory() {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

        this.postMessage({
            id: 'PostSparqlQueryHistory',
            history: queryService.getQueryHistory(),
            selectQueryId: this._pendingSelectQueryId
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
                // The webview's history request doubles as its "I'm listening" signal.
                this._resolveWebviewReady?.();
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
            this._armWebviewReady();

            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        }
    }

    /**
     * Arms the readiness signal for a webview that is about to be created, so a query
     * executed right after opening the panel waits for the webview to be listening.
     */
    private _armWebviewReady() {
        this._webviewReady = new Promise<void>(resolve => { this._resolveWebviewReady = resolve; });
    }

    /**
     * Waits until the webview has reported it is listening, capped by a timeout so a
     * missing signal never blocks execution.
     */
    private async _awaitWebviewReady(timeoutMs: number = 3000): Promise<void> {
        if (!this._webviewReady) {
            return;
        }

        await Promise.race([
            this._webviewReady,
            new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
        ]);
    }

    private async _executeQuery(queryState: SparqlQueryExecutionState) {
        if (this.view) {
            this.view.show();
        }

        // Mark this query as the one to select. Every history post during the execution
        // (and the webview's mount pull) carries this id, so the panel activates the tab as
        // soon as it appears — no dependence on which message reaches the webview first.
        this._pendingSelectQueryId = queryState.id;

        try {
            // When the panel was just opened for this query, wait until the webview is
            // listening so the execution-driven history pushes (which add the query's tab)
            // are delivered rather than dropped by the still-mounting webview.
            await this._awaitWebviewReady();

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
        } finally {
            // Clear the intent once the query is done so a later, unrelated history refresh
            // does not re-select this tab.
            if (this._pendingSelectQueryId === queryState.id) {
                this._pendingSelectQueryId = undefined;
            }
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

        // Select this graph-list tab once it appears (carried on every history post).
        this._pendingSelectQueryId = queryState.id;

        try {
            // Wait for a just-opened panel to be listening so the tab is added and selected
            // rather than left on the welcome page.
            await this._awaitWebviewReady();

            queryService.registerCompletedQuery(queryState);
        } finally {
            if (this._pendingSelectQueryId === queryState.id) {
                this._pendingSelectQueryId = undefined;
            }
        }
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
            this._armWebviewReady();
            
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        } else {
            this.view.show();
        }
    }
}