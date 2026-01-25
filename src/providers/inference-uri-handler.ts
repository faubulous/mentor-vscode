import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { InferenceUri } from '@src/workspace/inference-uri';

export class InferenceUriHandler implements vscode.UriHandler {
	readonly extensionId: string;

	constructor(context: vscode.ExtensionContext) {
		this.extensionId = context.extension.id;
	}

	register(): vscode.Disposable[] {
		return [vscode.window.registerUriHandler(this)];
	}

	async handleUri(uri: vscode.Uri) {
		if (uri.authority === this.extensionId && uri.path === '/inference') {
			try {
				// Parse the query parameter directly
				const query = new URLSearchParams(uri.query);
				const targetUri = query.get('uri');

				if (!targetUri) {
					throw new Error('No URI provided in inference request');
				}

				// Decode the URI parameter
				const inferenceUri = InferenceUri.toInferenceUri(targetUri);

				if (mentor.store.hasGraph(inferenceUri)) {
					const namespaces = mentor.prefixLookupService.getInferencePrefixes();
					const content = await mentor.store.serializeGraph(inferenceUri, 'text/turtle', undefined, namespaces);
					const document = await vscode.workspace.openTextDocument({ content, language: 'turtle' });

					await vscode.window.showTextDocument(document);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to load inference graph: ${error}`);
			}
		}
	}
}