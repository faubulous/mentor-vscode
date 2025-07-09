import * as vscode from 'vscode';
import { mentor } from '@/mentor';

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

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'out')]
        };

        // TODO: Move the following code into the factory class.
        const scriptUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'out', 'sparql-results-webview.js')
        );

        const elementsUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'out', 'vscode-elements.js')
        );

        webviewView.webview.html = `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="${elementsUri}" type="module"></script>
                    <script src="${scriptUri}" type="module"></script>
					<!-- Note: Do not add any styles here, as they will not be applied in notebook renderers. -->
                </head>
                <body>
                    <div id="root" class="webview"></div>
                </body>
            </html>`;
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