import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { WebviewComponentFactory } from '@/webviews/webview-component-factory';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import { QuadsResult } from '@/services/sparql-query-state';

/**
 * A provider for the SPARQL results webview. It handles the registration of the webview, 
 * message passing, and execution of SPARQL queries.
 */
export class SparqlResultsWebviewProvider implements vscode.WebviewViewProvider {
    public readonly viewType = 'mentor.view.sparqlResultsView';

    private readonly _subscriptions: vscode.Disposable[] = [];

    private _view?: vscode.WebviewView;

    private _context?: vscode.ExtensionContext;

    register(context: vscode.ExtensionContext) {
        this._context = context;

        this._subscriptions.push(vscode.window.registerWebviewViewProvider(this.viewType, this));
        this._subscriptions.push(mentor.sparqlQueryService.onDidHistoryChange(this._postQueryHistory, this));

        return this._subscriptions;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        if (!this._context) {
            throw new Error('Extension context is not initalized. Please register the provider first.');
        }

        this._view = new WebviewComponentFactory(this._context, 'sparql-results-panel.js').createView(webviewView);
        this._view.webview.onDidReceiveMessage(this._onDidReceiveMessage, this, this._subscriptions);
    }

    private _postQueryHistory() {
        if (!this._view) {
            return;
        }

        this._view.webview.postMessage({
            id: 'PostSparqlQueryHistory',
            history: mentor.sparqlQueryService.getQueryHistory()
        });
    }

    private async _onDidReceiveMessage(message: SparqlResultsWebviewMessages) {
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
        if (!this._view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        }

        if (!this._view) {
            throw new Error('Webview view is not initialized.');
        }

        const initialState = mentor.sparqlQueryService.createQuery(document);

        this._view.show();

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

export const sparqlResultsWebviewProvider = new SparqlResultsWebviewProvider();