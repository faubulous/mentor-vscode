import * as vscode from 'vscode';
import { isTemplate } from 'triplate';
import { TriplateCompileCache } from '../triplate-compile-cache';

export class TriplateHoverProvider implements vscode.HoverProvider {
	private readonly _cache = new TriplateCompileCache();

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const text = document.getText();

		if (!isTemplate(text)) {
			return null;
		}

		const offset = document.offsetAt(position);
		const name = this._getInterpolationNameAt(text, offset);

		if (!name) {
			return null;
		}

		// `triplate` is the single source of truth for the parameter schema.
		const compiled = this._cache.get(document);
		const declaration = compiled?.schema.params.find(p => p.name === name);

		if (declaration) {
			const typeLabel = `${declaration.type.base.kind}${declaration.type.array ? '[]' : ''}`;

			return this._hover(name, typeLabel, declaration.type.optional);
		} else {
			return null;
		}
	}

	private _hover(name: string, typeLabel: string, optional: boolean): vscode.Hover {
		const attrs = optional ? ' · optional' : '';

		const content = new vscode.MarkdownString();
		content.appendMarkdown(`**${name}** ${typeLabel}${attrs}`);

		return new vscode.Hover(content);
	}

	/**
	 * Returns the name of the triplate `${name}` interpolation that contains `offset`,
	 * or `null` if the offset is not inside any interpolation.
	 */
	private _getInterpolationNameAt(text: string, offset: number): string | null {
		for (const m of text.matchAll(/\$\{([^}]*)\}/g)) {
			if (m.index! <= offset && offset < m.index! + m[0].length) {
				return m[1];
			}
		}
		
		return null;
	}
}
