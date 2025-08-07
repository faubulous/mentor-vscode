import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { SparqlResultsWebviewFactory } from '@/views/sparql-results/sparql-results-webview-factory';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
/**
 * A provider for the SPARQL results webview. It handles the registration of the webview, 
 * message passing, and execution of SPARQL queries.
 */
export class SparqlResultsWebviewProvider implements vscode.WebviewViewProvider {
    public readonly viewType = 'mentor.sparqlResultsView';

    private readonly _subscriptions: vscode.Disposable[] = [];

    private _view?: vscode.WebviewView;

    private _context?: vscode.ExtensionContext;

    public register(context: vscode.ExtensionContext) {
        this._context = context;

        const subscription = vscode.window.registerWebviewViewProvider(this.viewType, this);

        this._subscriptions.push(subscription);

        return subscription;
    }

    public dispose() {
        this._subscriptions.forEach(subscription => subscription.dispose());
        this._subscriptions.length = 0;

        this._view = undefined;
        this._context = undefined;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        if (!this._context) {
            throw new Error('Extension context is not initalized. Please register the provider first.');
        }

        this._view = new SparqlResultsWebviewFactory().createView(this._context, webviewView);
        this._view.webview.onDidReceiveMessage(this._onDidReceiveMessage, this, this._subscriptions);
    }

    private async _onDidReceiveMessage(message: SparqlResultsWebviewMessages) {
        switch (message.id) {
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));
                return;
            }
            case 'GetSparqlQueryHistoryRequest': {
                const history = mentor.sparqlQueryService.getQueryHistory();
                this._postMessage({ id: 'GetSparqlQueryHistoryResponse', history });
                return;
            }
        }
    }

    private _postMessage(message: SparqlResultsWebviewMessages) {
        if (!this._view) {
            throw new Error('Webview view is not initialized.');
        }

        this._view.webview.postMessage(message);
    }

    public async executeQuery(document: vscode.TextDocument) {
        if (!this._view) {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            await vscode.commands.executeCommand(`${this.viewType}.focus`);
        }

        if (!this._view) {
            throw new Error('Webview view is not initialized.');
        }

        const initialState = mentor.sparqlQueryService.createQuery(document);

        this._view.show();

        this._postMessage({ id: 'SetSparqlQueryState', queryState: initialState });

        const updatedState = await mentor.sparqlQueryService.executeQuery(initialState);

        this._postMessage({ id: 'SetSparqlQueryState', queryState: updatedState });
    }
}

export const sparqlResultsWebviewProvider = new SparqlResultsWebviewProvider();