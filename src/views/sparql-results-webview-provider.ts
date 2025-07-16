import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { SparqlResultsWebviewFactory } from './sparql-results-webview-factory';

export class SparqlResultsWebviewProvider implements vscode.WebviewViewProvider {
    public readonly viewType = 'mentor.sparqlResultsView';

    private _view?: vscode.WebviewView;

    private _context?: vscode.ExtensionContext;

    public register(context: vscode.ExtensionContext) {
        this._context = context;

        return vscode.window.registerWebviewViewProvider(this.viewType, this);
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
    }

    public async executeQuery(documentIri: string, query: string) {
        if (!this._view) {
            throw new Error('Webview view is not initialized.');
        }

        const results = await mentor.sparqlQueryService.executeQuery(query, documentIri);

        this._view.show();
        this._view.webview.postMessage(results);
    }
}

export const sparqlResultsWebviewProvider = new SparqlResultsWebviewProvider();