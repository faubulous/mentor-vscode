import * as vscode from 'vscode';

export class SparqlResultsViewProvider implements vscode.WebviewViewProvider {
	readonly viewType = 'mentor.view.sparqlResults';

	private _view?: vscode.WebviewView;

	private _context?: vscode.ExtensionContext;

	private _pendingData?: any;

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	) {
		if (!this._context) {
			throw new Error('Extension context is not set; call register() first.');
		}

		this._view = webviewView;
		this._view.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'out')]
		};

		this._view.webview.html = this._getHtmlForWebview();

		this._view.webview.onDidReceiveMessage(message => {
			if (message.type === 'ready') {
				if (this._pendingData) {
					this._view?.webview.postMessage(this._pendingData);
					this._pendingData = undefined;
				}
			}
		});
	}

	register(context: vscode.ExtensionContext) {
		this._context = context;

		return vscode.window.registerWebviewViewProvider(this.viewType, this);
	}

	reveal() {
		this._view?.show();
	}

	postMessage(data: any) {
		if (this._view) {
			this._view.webview.postMessage(data);
		} else {
			this._pendingData = data;
		}
	}

	private _getHtmlForWebview() {
		if (!this._context) {
			throw new Error('Extension context is not set.');
		}

		const scriptUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'out', 'sparql-results-webview.js')
		);

		const elementsUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'out', 'vscode-elements.js')
		);

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<script src="${elementsUri}" type="module"></script>
					<script src="${scriptUri}" type="module"></script>
				</head>
				<body>
					<div id="root">Hello World</div>
				</body>
			</html>`;
	}
}

export const sparqlResultsViewProvider = new SparqlResultsViewProvider();
