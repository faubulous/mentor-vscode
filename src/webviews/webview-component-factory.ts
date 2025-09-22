import * as vscode from 'vscode';

/**
 * Factory class for creating webview panels and views.
 */
export class WebviewComponentFactory {
	/**
	 * Creates a webview factory for creating webview panels and views for a specific component.
	 * @param _context The extension context.
	 * @param _componentPath The path to the webview component.
	 */
	constructor(private _context: vscode.ExtensionContext, private _componentPath: string) { }

	/**
	 * Creates a webview panel that can be displayed in the editor area.
	 * @param context The extension context.
	 * @param id The identifier for the webview panel.
	 * @param title The title of the webview panel.
	 * @param viewColumn The column in which to display the webview panel.
	 * @returns The created webview panel.
	 */
	createPanel(id: string, title: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.Beside): vscode.WebviewPanel {
		const options = this._getWebviewOptions();

		const panel = vscode.window.createWebviewPanel(id, title, viewColumn, options);
		panel.webview.html = this._getWebviewHtml(panel.webview);

		return panel;
	}

	/**
	 * Inititalises a webview view that can be displayed in the sidebar or terminal panel.
	 * @param context The extension context.
	 * @param view The webview view to initialize.
	 * @returns The initialized webview view.
	 */
	createView(view: vscode.WebviewView): vscode.WebviewView {
		view.webview.options = this._getWebviewOptions();
		view.webview.html = this._getWebviewHtml(view.webview);

		return view;
	}

	private _getWebviewOptions(): vscode.WebviewOptions {
		return {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'out')]
		};
	}

	private _getWebviewHtml(webview: vscode.Webview): string {
		const codeiconUrl = webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'out', 'codicon.css')
		);

		const elementsUrl = webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'out', 'vscode-elements.js')
		);

		const componentUrl = webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'out', this._componentPath)
		);

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${codeiconUrl}" rel="stylesheet" id="vscode-codicon-stylesheet">
					<script src="${elementsUrl}" type="module"></script>
					<script src="${componentUrl}" type="module"></script>
					<!-- Note: Do not add any styles here, as they will not be applied in notebook renderers. -->
				</head>
				<body>
					<div id="root"></div>
				</body>
			</html>`;
	}
}