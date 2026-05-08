import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store, NamedNode } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';

/**
 * Provides hover information for tokens in RDF documents and for HTTP/HTTPS URIs in any file type.
 */
export class ResourceTooltipProvider implements vscode.HoverProvider {	
	private readonly _contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

	private readonly _store = container.resolve<Store>(ServiceToken.Store);

	constructor() {
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(vscode.languages.registerHoverProvider('*', this));
	}

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this._contextService.contexts[document.uri.toString()];

		if (context) {
			const iri = context.getIriAtPosition(position);

			if (iri) {
				return new vscode.Hover(context.getResourceTooltip(iri));
			}

			const literalValue = context.getLiteralAtPosition(position);

			if (literalValue) {
				return new vscode.Hover(literalValue);
			}

			return null;
		}

		// Generic fallback: detect HTTP/HTTPS URIs in any file type.
		const iri = this._getUriAtTextPosition(document, position);

		if (!iri) {
			return null;
		}

		// Only surface known resources (those with triples in the workspace store).
		let isKnown = false;

		for (const _ of this._store.matchAll(undefined, new NamedNode(iri), null, null, false)) {
			isKnown = true;
			break;
		}

		if (!isKnown) {
			return null;
		}

		// Any loaded context shares the same workspace store for label/description lookups.
		const workspaceContext = this._contextService.activeContext
			?? Object.values(this._contextService.contexts).find(c => c.isLoaded);

		if (!workspaceContext) {
			return null;
		}

		return new vscode.Hover(workspaceContext.getResourceTooltip(iri));
	}

	private _getUriAtTextPosition(document: vscode.TextDocument, position: vscode.Position): string | null {
		const line = document.lineAt(position.line).text;
		const cursor = position.character;

		// Patterns in order of specificity; captured group 1 is the clean URI without delimiters.
		const patterns: [RegExp, number][] = [
			[/<(https?:\/\/[^>\s]+)>/g, 1],
			[/"(https?:\/\/[^"]+)"/g, 1],
			[/'(https?:\/\/[^']+)'/g, 1],
			[/(https?:\/\/[^\s"'<>`(){}\[\],;]+)/g, 1],
		];

		for (const [pattern, group] of patterns) {
			let match: RegExpExecArray | null;

			while ((match = pattern.exec(line)) !== null) {
				if (cursor >= match.index && cursor <= match.index + match[0].length) {
					return match[group];
				}
			}
		}

		return null;
	}
}
