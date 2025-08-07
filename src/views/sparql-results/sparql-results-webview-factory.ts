import * as vscode from 'vscode';

/**
 * Factory class for creating SPARQL results webview panels and views.
 */
export class SparqlResultsWebviewFactory {

	/**
	 * Creates a webview panel for displaying SPARQL results.
	 * @param context The extension context.
	 * @param viewColumn The column in which to display the webview panel.
	 * @returns The created webview panel.
	 */
	createPanel(context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn = vscode.ViewColumn.Beside): vscode.WebviewPanel {
		const id = 'mentor.sparqlResultsPanel';
		const title = 'SPARQL Results';

		const options = {
			...this._getWebviewOptions(context),
			retainContextWhenHidden: true
		};

		const panel = vscode.window.createWebviewPanel(id, title, viewColumn, options);
		panel.webview.html = this._getWebviewHtml(context, panel.webview);

		return panel;
	}

	/**
	 * Inititalises a webview with the SPARQL results view HTML and options.
	 * @param context The extension context.
	 * @param view The webview view to initialize.
	 * @returns The initialized webview view.
	 */
	createView(context: vscode.ExtensionContext, view: vscode.WebviewView): vscode.WebviewView {
		view.webview.options = this._getWebviewOptions(context);
		view.webview.html = this._getWebviewHtml(context, view.webview);

		return view;
	}

	private _getWebviewOptions(context: vscode.ExtensionContext): vscode.WebviewOptions {
		return {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')]
		};
	}

	private _getWebviewHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
		const codeiconUrl = webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, 'out', 'codicon.css')
		);

		const elementsUrl = webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, 'out', 'vscode-elements.js')
		);

		const scriptUrl = webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, 'out', 'sparql-results-webview.js')
		);

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${codeiconUrl}" rel="stylesheet" id="vscode-codicon-stylesheet">
					<script src="${elementsUrl}" type="module"></script>
					<script src="${scriptUrl}" type="module"></script>
					<!-- Note: Do not add any styles here, as they will not be applied in notebook renderers. -->
				</head>
				<body>
					<div id="root"></div>
				</body>
			</html>`;
	}
}