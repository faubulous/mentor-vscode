import * as vscode from 'vscode';
import html from '@/views/sparql-results-view.html';

export class SparqlResultsViewProvider implements vscode.WebviewViewProvider {
	readonly viewType = 'mentor.view.sparqlResults';

	private _view?: vscode.WebviewView;

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	) {
		this._view = webviewView;
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = html;
	}

	register() {
		return vscode.window.registerWebviewViewProvider(this.viewType, this);
	}

	reveal() {
		this._view?.show?.(true);
	}

	postMessage(message: any) {
		this._view?.webview.postMessage(message);
	}
}

export const sparqlResultsViewProvider = new SparqlResultsViewProvider();