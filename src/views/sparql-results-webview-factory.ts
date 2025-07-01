
import * as vscode from 'vscode';

export class SparqlResultsViewFactory {

	createWebviewPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
		const panel = vscode.window.createWebviewPanel(
			'mentor.sparqlResultsPanel',
			'SPARQL Results',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')]
			}
		);

		const scriptUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, 'out', 'sparql-results-webview.js')
		);
		
		const elementsUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, 'out', 'vscode-elements.js')
		);

		panel.webview.html = `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<script src="${elementsUri}" type="module"></script>
					<script src="${scriptUri}" type="module"></script>
					<style type="text/css">
						pre { margin: 0; }
					</style>
				</head>
				<body>
					<div id="root"></div>
				</body>
			</html>`;

		return panel;
	}
}