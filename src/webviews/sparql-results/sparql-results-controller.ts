import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QuadsResult } from '@/services/sparql-query-state';
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

    async executeQuery(document: vscode.TextDocument) {
        if (!this.view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        }

        if (!this.view) {
            throw new Error('Webview view is not initialized.');
        }

        const initialState = mentor.sparqlQueryService.createQuery(document);

        this.view.show();

        const updatedState = await mentor.sparqlQueryService.executeQuery(initialState);

        if (updatedState.result?.type === 'quads') {
            const result = updatedState.result as QuadsResult;
            const document = await vscode.workspace.openTextDocument({
                content: result.document,
                language: 'turtle'
            });

            await vscode.window.showTextDocument(document);
        }
    }
}

export const sparqlResultsWebviewProvider = new SparqlResultsWebviewController();