import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService, ISparqlQueryService } from '@src/languages/sparql/services';
import { QuadsResult, SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';

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
            default:
                return super.onDidReceiveMessage(message);
        }
    }

    private async _handleEditBackgroundQuery(queryId: string) {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.getQueryHistory().find(q => q.id === queryId);

        if (!queryState?.query || !queryState.connectionId) {
            return;
        }

        const document = await vscode.workspace.openTextDocument({
            content: queryState.query,
            language: 'sparql'
        });

        const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
        await connectionService.setQuerySourceForDocument(document.uri, queryState.connectionId);

        this.postMessage({
            id: 'UpdateQueryDocumentIri',
            queryId,
            documentIri: document.uri.toString()
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
     */
    async executeQuery(queryContext: vscode.TextDocument | vscode.NotebookCell, query: string) {
        await this._prepareQueryExecution(queryContext);

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.createQuery(queryContext, query);

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
        if (!this.view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        } else {
            this.view.show();
        }

        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const queryState = queryService.createBackgroundQuery(connection, query, label);

        await this._executeQuery(queryState);
    }
}