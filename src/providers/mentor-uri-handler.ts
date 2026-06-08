import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IPrefixLookupService } from '@src/services/document';
import { Store } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/providers/inference-uri';
import { IViewRouter } from '@src/views/webviews';
import { SETTINGS_GROUPS, SettingsSectionId } from '@src/views/webviews/views/settings/sections';

/**
 * Single URI handler for the extension. VS Code allows only one handler per
 * extension, so all `vscode://faubulous.mentor/…` deep links are dispatched here
 * by path:
 *
 * - `/inference?uri=<graph>` — opens the inferred-triples graph in a Turtle editor.
 * - `/settings[?section=<id>]` — opens the settings panel, optionally on a section
 *   (e.g. `?section=query.connections`). Intended for linking from external docs.
 */
export class MentorUriHandler implements vscode.UriHandler {
	readonly extensionId: string;

	/** Valid settings section ids, derived from the single source of truth. */
	private static readonly _sectionIds = new Set<SettingsSectionId>(
		SETTINGS_GROUPS.flatMap(g => g.sections.map(s => s.id))
	);

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
		if (uri.authority !== this.extensionId) {
			return;
		}

		switch (uri.path) {
			case '/inference':
				return this.handleInference(uri);
			case '/settings':
				return this.handleSettings(uri);
		}
	}

	private async handleInference(uri: vscode.Uri) {
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

	private async handleSettings(uri: vscode.Uri) {
		try {
			const requested = new URLSearchParams(uri.query).get('section');
			const section = requested && MentorUriHandler._sectionIds.has(requested as SettingsSectionId)
				? requested as SettingsSectionId
				: undefined;

			const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
			
			await router.open({ kind: 'settings', section }, vscode.ViewColumn.Active);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open settings: ${error}`);
		}
	}
}
