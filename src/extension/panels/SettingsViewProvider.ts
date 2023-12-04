import * as vscode from 'vscode';
import { getUri, getNonce } from "../../utilities";

export class SettingsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'mentor.view.settings';

	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const webviewUri = getUri(webview, this._extensionUri, ["out", "webview.js"]);
		const styleUri = getUri(webview, this._extensionUri, ["out", "style.css"]);
		const codiconUri = getUri(webview, this._extensionUri, ["out", "codicon.css"]);
		const nonce = getNonce();

		// Note: Since the below HTML is defined within a JavaScript template literal, all of
		// the HTML for each component demo can be defined elsewhere and then imported/inserted
		// into the below code. This can help with code readability and organization.
		//
		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
		  <!DOCTYPE html>
		  <html lang="en">
			<head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			  <link rel="stylesheet" href="${styleUri}">
			  <link rel="stylesheet" href="${codiconUri}">
			  <title>Mentor Settings</title>
			</head>
			<body>
			  <vscode-text-field placeholder="Find"></vscode-text-field>
			  <vscode-panels aria-label="With Badge">
				<vscode-panel-tab id="tab-1">
				  Classes
				  <vscode-badge>1</vscode-badge>
				</vscode-panel-tab>
				<vscode-panel-tab id="tab-2">
				  Properties
				  <vscode-badge>1</vscode-badge>
				</vscode-panel-tab>
				<vscode-panel-tab id="tab-3">
				  Individuals
				</vscode-panel-tab>
				<vscode-panel-view id="view-1"></vscode-panel-view>
				<vscode-panel-view id="view-2"></vscode-panel-view>
				<vscode-panel-view id="view-3"></vscode-panel-view>
			  </vscode-panels>
			  <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
			</body>
		  </html>
		`;
	}
}
