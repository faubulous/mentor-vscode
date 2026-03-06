import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IPrefixLookupService } from '@src/services/core';
import { Store } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/workspace/inference-uri';

export class InferenceUriHandler implements vscode.UriHandler {
	readonly extensionId: string;

	private get _store() {
		return container.resolve<Store>(ServiceToken.Store);
	}

	constructor() {
		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		this.extensionId = context.extension.id;
		context.subscriptions.push(
			vscode.window.registerUriHandler(this)
		);
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

				if (this._store.hasGraph(inferenceUri)) {
					const prefixLookup = container.resolve<IPrefixLookupService>(ServiceToken.PrefixLookupService);
					const namespaces = prefixLookup.getInferencePrefixes();
					const content = await this._store.serializeGraph(inferenceUri, 'text/turtle', undefined, namespaces);
					const document = await vscode.workspace.openTextDocument({ content, language: 'turtle' });

					await vscode.window.showTextDocument(document);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to load inference graph: ${error}`);
			}
		}
	}
}