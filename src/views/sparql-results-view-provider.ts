import * as vscode from 'vscode';
import html from '@/views/sparql-results-view.html';

export class SparqlResultsViewProvider implements vscode.WebviewViewProvider {
	readonly viewType = 'mentor.view.sparqlResults';

	private _view?: vscode.WebviewView;

	private _context?: vscode.ExtensionContext;

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	) {
		if (!this._context) {
			throw new Error('Extension context is not set; call register() first.');
		}

		this._view = webviewView;
		webviewView.webview.options = { enableScripts: true };

		const scriptUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode-elements.js')
		);

		webviewView.webview.html = html.replace('{{vscodeElementsScript}}', scriptUri.toString());
	}

	register(context: vscode.ExtensionContext) {
		this._context = context;

		return vscode.window.registerWebviewViewProvider(this.viewType, this);
	}

	reveal() {
		this._view?.show();
	}

	postMessage(data: any) {
		this._view?.webview.postMessage(data);
	}
}

export const sparqlResultsViewProvider = new SparqlResultsViewProvider();