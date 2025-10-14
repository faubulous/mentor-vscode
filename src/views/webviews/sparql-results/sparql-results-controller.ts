import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { QuadsResult, SparqlQueryExecutionState } from '@src/services/sparql-query-state';
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
    }

    register(context: vscode.ExtensionContext) {
        const subscriptions = super.register(context);

        subscriptions.push(mentor.sparqlQueryService.onDidHistoryChange(this._postQueryHistory, this));

        return subscriptions;
    }

    private _postQueryHistory() {
        this.postMessage({
            id: 'PostSparqlQueryHistory',
            history: mentor.sparqlQueryService.getQueryHistory()
        });
    }

    protected async onDidReceiveMessage(message: SparqlResultsWebviewMessages) {
        switch (message.id) {
            case 'GetSparqlQueryHistory': {
                this._postQueryHistory();
                return;
            }
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));
                return;
            }
        }
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

        const updatedState = await mentor.sparqlQueryService.executeQuery(queryState);

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

        const queryState = mentor.sparqlQueryService.createQuery(queryContext, query);

        await this._executeQuery(queryState);
    }

    /**
     * Executes a SPARQL query from the contents of a text document or notebook cell.
     * @param queryContext The text document or notebook cell containing the SPARQL query.
     * @returns A promise that resolves when the query execution is complete.
     */
    async executeQueryFromTextDocument(queryContext: vscode.TextDocument | vscode.NotebookCell) {
        await this._prepareQueryExecution(queryContext);

        const queryState = mentor.sparqlQueryService.createQueryFromDocument(queryContext);

        await this._executeQuery(queryState);
    }
}

export const sparqlResultsController = new SparqlResultsController();