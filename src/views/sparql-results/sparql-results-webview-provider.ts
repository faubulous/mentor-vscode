import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { SparqlResultsWebviewFactory } from '@/views/sparql-results/sparql-results-webview-factory';

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

    private async _onDidReceiveMessage(message: any) {
        if (message.type === 'executeCommand') {
            vscode.commands.executeCommand(message.command, ...message.args);
        }
    }

    public async executeQuery(documentIri: string, query: string) {
        if (!this._view) {
            throw new Error('Webview view is not initialized.');
        }

        const context = mentor.sparqlQueryService.prepareQuery(documentIri, query);

        this._view.show();
        this._view.webview.postMessage(context);

        await mentor.sparqlQueryService.executeQuery(context);

        this._view.webview.postMessage(context);
    }
}

export const sparqlResultsWebviewProvider = new SparqlResultsWebviewProvider();