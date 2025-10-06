import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QuadsResult, SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { WebviewController } from '@/webviews/webview-controller';
import { SparqlResultsWebviewMessages } from './sparql-results-messages';

/**
 * A controller for the SPARQL results webview. It handles the registration of the webview, 
 * message passing, and execution of SPARQL queries.
 */
export class SparqlResultsWebviewController extends WebviewController<SparqlResultsWebviewMessages> {
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
        console.debug('onDidReceiveMessage', message);

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

    private async _prepareQueryExecution() {
        if (!this.view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        }
    }

    private async _executeQuery(queryState: SparqlQueryExecutionState) {
        if (!this.view) {
            throw new Error('Webview view is not initialized.');
        }

        this.view.show();

        const updatedState = await mentor.sparqlQueryService.executeQuery(queryState);

        if (updatedState.result?.type === 'quads') {
            const result = updatedState.result as QuadsResult;
            const document = await vscode.workspace.openTextDocument({
                content: result.document,
                language: 'turtle'
            });

            console.log(result);

            await vscode.window.showTextDocument(document);
        }
    }

    /**
     * Executes a SPARQL query from a query string and a context document or notebook cell.
     * @param queryContext A text document or notebook cell from which to load the SPARQL endpoint.
     * @param query The SPARQL query string.
     */
    async executeQuery(queryContext: vscode.TextDocument | vscode.NotebookCell, query: string) {
        await this._prepareQueryExecution();

        const queryState = mentor.sparqlQueryService.createQuery(queryContext, query);

        await this._executeQuery(queryState);
    }

    /**
     * Executes a SPARQL query from the contents of a text document or notebook cell.
     * @param document The text document or notebook cell containing the SPARQL query.
     * @returns A promise that resolves when the query execution is complete.
     */
    async executeQueryFromTextDocument(document: vscode.TextDocument | vscode.NotebookCell) {
        await this._prepareQueryExecution();

        const queryState = mentor.sparqlQueryService.createQueryFromDocument(document);

        await this._executeQuery(queryState);
    }
}

export const sparqlResultsWebviewProvider = new SparqlResultsWebviewController();