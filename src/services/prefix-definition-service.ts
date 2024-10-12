import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { IToken } from 'millan';
import { getIriFromNodeId, getNamespaceIri, isUpperCase } from '../utilities';
import { DocumentContext } from '../languages';
import { FeatureProvider } from '../providers';

/**
 * Specifies a how a namespace prefix should be defined in a document.
 */
export interface PrefixDefinition {
	/**
	 * The namespace prefix.
	 */
	prefix: string;

	/**
	 * The namespace IRI or `undefined` if the IRI should be looked up.
	 */
	namespaceIri: string | undefined;
}

/**
 * A service for declaring prefixes in RDF documents.
 */
export class PrefixDefinitionService extends FeatureProvider {
	/**
	 * Sort the prefixes in a document.
	 * @param document The RDF document.
	 */
	public async sortPrefixes(document: vscode.TextDocument): Promise<vscode.WorkspaceEdit> {
		const context = mentor.contexts[document.uri.toString()];

		if (!context) return new vscode.WorkspaceEdit();

		const edit = new vscode.WorkspaceEdit();

		const prefixes: PrefixDefinition[] = [];

		Object.keys(context.namespaces).forEach(prefix => {
			const namespaceIri = context.namespaces[prefix];

			prefixes.push({ prefix, namespaceIri });
		});

		await this._implementPrefixesSorted(edit, document, context, prefixes);

		return edit;
	}

	/**
	 * Delete prefix definitions from a document.
	 * @param document The RDF document.
	 * @param prefixes The prefixes to delete.
	 */
	public async deletePrefixes(document: vscode.TextDocument, prefixes: string[]): Promise<vscode.WorkspaceEdit> {
		const context = mentor.contexts[document.uri.toString()];

		if (!context) return new vscode.WorkspaceEdit();

		const tokenTypes = context.getTokenTypes();

		const edit = new vscode.WorkspaceEdit();

		const prefixCount = Object.keys(context.namespaces).length;

		// Number of processed prefixes.
		let n = 0;

		for (let i = 0; i < context.tokens.length; i++) {
			const currentToken = context.tokens[i];

			if (currentToken.tokenType?.tokenName === tokenTypes.PREFIX) {
				n = n + 1;

				const nextToken = context.tokens[i + 1];

				if (nextToken) {
					const prefix = nextToken.image.split(':')[0];

					if (prefixes.includes(prefix)) {
						let line = (nextToken.startLine ?? 1) - 1;
						let start = new vscode.Position(line, 0);
						let end = new vscode.Position(line + 1, 0);

						edit.delete(document.uri, new vscode.Range(start, end));

						// Delete any empty lines following the prefix definition of all prefixes but the last.
						while (n < prefixCount && line + 1 < document.lineCount && document.lineAt(line + 1).isEmptyOrWhitespace) {
							line++;

							start = new vscode.Position(line, 0);
							end = new vscode.Position(line + 1, 0);

							edit.delete(document.uri, new vscode.Range(start, end));
						}
					}
				}
			}

			// Break if all prefixes have been caputred by the edit.
			if (edit.size === prefixes.length) {
				break;
			}
		}

		return edit;
	}

	/**
	 * Implement missing prefixes in a document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to implement.
	 */
	public async implementPrefixes(document: vscode.TextDocument, prefixes: PrefixDefinition[]): Promise<vscode.WorkspaceEdit> {
		const edit = new vscode.WorkspaceEdit();

		const context = mentor.contexts[document.uri.toString()];

		if (context) {
			await this._implementPrefixes(edit, document, context, prefixes);
		}

		return edit;
	}

	/**
	 * Implement missing prefixes in a document respecting the prefix definition mode set by the user.
	 * @param edit The workspace edit.
	 * @param document The text document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to be implemented.
	 */
	private async _implementPrefixes(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, context: DocumentContext, prefixes: PrefixDefinition[]) {
		const mode = await mentor.configuration.get('prefixes.prefixDefinitionMode');

		if (mode === 'Sorted') {
			await this._implementPrefixesSorted(edit, document, context, prefixes);
		} else {
			await this._implementPrefixesAppended(edit, document, context, prefixes);
		}
	}

	/**
	 * Delete empty lines after a token in a document.
	 * @param edit The workspace edit.
	 * @param document The text document.
	 * @param token The token after which to delete empty lines.
	 */
	private _deleteEmptyLinesAfterToken(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, token: IToken) {
		let position = new vscode.Position(token.endLine ?? 0, 0);

		while (position.line < document.lineCount) {
			const line = document.lineAt(position.line);

			if (!line.isEmptyOrWhitespace) {
				break;
			}

			edit.delete(document.uri, line.rangeIncludingLineBreak);

			position = position.translate(1, 0);
		}
	}

	/**
	 * Implement missing prefixes in a document by appending the new prefixes to the end of the prefix definition list.
	 * @param document The text document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to be implemented.
	 * @param tokenType The token type of the prefix token.
	 */
	private async _implementPrefixesAppended(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, context: DocumentContext, prefixes: PrefixDefinition[]) {
		// Get the prefix token type name from the language specific context.
		const tokenTypes = context.getTokenTypes();

		// Insert the new prefix declaration after the last prefix declaration in the document.
		const lastPrefix = context.getLastTokenOfType(tokenTypes.PREFIX);

		// Determine whether the prefixes should be in uppercase.
		const upperCase = isUpperCase(lastPrefix ?? context.tokens[0]);

		let insertPosition = new vscode.Position(lastPrefix ? (lastPrefix.endLine ?? 0) : 0, 0);

		// 1. Append the new prefixes to the end of the prefix definition list.
		prefixes
			.sort()
			.filter(x => !context.namespaces[x.prefix] && !x.namespaceIri)
			.forEach(x => {
				const iri = x.namespaceIri ?? mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), x.prefix);
				const definition = context.getPrefixDefinition(x.prefix, iri, upperCase);

				edit.insert(context.uri, insertPosition, definition + '\n');

				insertPosition = insertPosition.translate(1, 0);
			});

		// 2. Delete leading new lines if there are any prefixes.
		if (lastPrefix) {
			this._deleteEmptyLinesAfterToken(edit, document, lastPrefix);
		}

		// 3. Insert a new line at the end of the document if there were any edits. Note: this also includes the deleted new lines.
		if (edit.size > 0) {
			edit.insert(context.uri, insertPosition, '\n');
		}
	}

	/**
	 * Implement missing prefixes in a document by maintaining a sorted list of prefixes at the beginning of the document.
	 * @param document The text document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to be implemented.
	 * @param tokenType The token type of the prefix token.
	 */
	private async _implementPrefixesSorted(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, context: DocumentContext, prefixes: PrefixDefinition[]) {
		// Get the prefix token type name from the language specific context.
		const tokenTypes = context.getTokenTypes();

		// 1. Delete the existing prefix definitions.
		let currentLine = 0;

		// Iterate over all tokens in the document...
		for (let token of context.tokens) {
			if (token.tokenType?.tokenName === tokenTypes.PREFIX) {
				// If we see a prefix token, delete the line and all preceding empty lines.
				const line = (token.startLine ?? 1) - 1;

				// Delete lines from the current line up to the start line of the prefix token
				while (currentLine <= line) {
					const start = new vscode.Position(currentLine, 0);
					const end = new vscode.Position(currentLine + 1, 0);

					edit.delete(context.uri, new vscode.Range(start, end));
					currentLine += 1;
				}
			} else if (token.startLine && token.startLine !== currentLine) {
				// If the token is on a new line and not a prefix token, we're done.
				break;
			}
		}

		// 2. Delete leading new lines and insert a new line at the beginning of the document.
		const lastPrefix = context.getLastTokenOfType(tokenTypes.PREFIX);

		if (lastPrefix) {
			this._deleteEmptyLinesAfterToken(edit, document, lastPrefix);
		}

		// 3. Implement the prefixes in a sorted order.
		const namespaceMap = { ...context.namespaces };

		for (let x of prefixes) {
			namespaceMap[x.prefix] = x.namespaceIri ?? mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), x.prefix);
		}

		// Determine whether the prefixes should be in uppercase.
		const upperCase = isUpperCase(lastPrefix ?? context.tokens[0]);

		for (let prefix of Object.keys(namespaceMap).sort()) {
			const namespaceIri = namespaceMap[prefix];
			const definition = context.getPrefixDefinition(prefix, namespaceIri, upperCase);

			edit.insert(context.uri, new vscode.Position(0, 0), definition + '\n');
		}

		edit.insert(context.uri, new vscode.Position(0, 0), '\n');
	}

	/**
	 * Implement a prefix for a IRI in a document.
	 * @param document The RDF document.
	 * @param iri The namespace IRI for which to implement a prefix.
	 */
	async implementPrefixForIri(document: vscode.TextDocument, iri: string): Promise<vscode.WorkspaceEdit> {
		const context = mentor.contexts[document.uri.toString()];

		if (!context) new vscode.WorkspaceEdit();

		const tokenTypes = context.getTokenTypes();

		// The provided IRI may be a full IRI or a namespace IRI.
		const namespaceIri = getNamespaceIri(iri);

		// Reuse existing prefixs if already defined.
		let prefix = context.getPrefixForNamespaceIri(namespaceIri);

		if (!prefix) {
			// Look up the prefix for the namespace IRI in the document, configuration, or default prefixes.
			prefix = mentor.prefixLookupService.getPrefixForIri(document.uri.toString(), namespaceIri, 'ns');
		}

		const edit = new vscode.WorkspaceEdit();

		for (let i = 0; i < context.tokens.length; i++) {
			const token = context.tokens[i];

			if (token.tokenType?.tokenName !== tokenTypes.IRIREF || !token.image.includes(namespaceIri)) {
				continue;
			}

			if (i > 0) {
				// Do not replace the IRI in a base definition.
				const t1 = context.tokens[i - 1];

				if (t1.tokenType?.tokenName === tokenTypes.BASE) {
					continue;
				}
			}

			if (i > 1) {
				// Do not replace the IRI in a prefix definition.
				const t2 = context.tokens[i - 2];

				if (t2.tokenType?.tokenName === tokenTypes.PREFIX) {
					continue;
				}
			}

			const localName = getIriFromNodeId(token.image).substring(namespaceIri.length);
			const location = this.getLocationFromToken(document.uri, token);

			// Delete the entire IRI token.
			edit.replace(location.uri, location.range, `${prefix}:${localName}`);
		}

		// Only implement the prefix if not already defined.
		if (!context.namespaces[prefix]) {
			await this._implementPrefixes(edit, document, context, [{ prefix, namespaceIri }]);
		}

		return edit;
	}
}