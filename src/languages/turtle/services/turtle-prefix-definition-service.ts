import * as vscode from 'vscode';
import { IToken, TokenType } from 'chevrotain';
import { injectable, inject, delay } from 'tsyringe';
import { Uri } from '@faubulous/mentor-rdf';
import { TOKENS, isUpperCaseToken, getFirstTokenOfType, getLastTokenOfType } from '@faubulous/mentor-rdf-parsers';
import { ConfigurationProvider } from '@src/container';
import { DocumentContextManager } from '@src/workspace/document-context-manager';
import { PrefixLookupService } from '@src/services/prefix-lookup-service';
import { getIriFromIriReference } from '@src/utilities';
import { TurtleDocument } from '@src/languages';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

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
@injectable()
export class TurtlePrefixDefinitionService extends TurtleFeatureProvider {
	constructor(
		@inject(delay(() => ConfigurationProvider)) private readonly configuration: ConfigurationProvider,
		@inject(delay(() => DocumentContextManager)) private readonly contextManager: DocumentContextManager,
		@inject(delay(() => PrefixLookupService)) private readonly prefixLookupService: PrefixLookupService
	) {
		super();
	}

	/**
	 * The default token type for prefix definitions. This is used when appending 
	 * new prefixes to the end of the prefix definition list.
	 */
	private _defaultPrefixTokenType = TOKENS.PREFIX;

	/**
	 * A set of supported token types for prefix definitions.
	 */
	private _prefixTokenTypes = new Set([TOKENS.PREFIX.name, TOKENS.TTL_PREFIX.name]);

	/**
	 * A set of supported token types for base IRI definitions.
	 */
	private _baseTokenTypes = new Set([TOKENS.BASE.name, TOKENS.TTL_BASE.name]);

	/**
	 * Sort the prefixes in a document.
	 * @param document The RDF document.
	 */
	public async sortPrefixes(document: vscode.TextDocument): Promise<vscode.WorkspaceEdit> {
		const context = this.contextManager.getDocumentContext(document, TurtleDocument);

		if (!context) return new vscode.WorkspaceEdit();

		const edit = new vscode.WorkspaceEdit();

		// Collect prefix lines with their line numbers.
		const prefixLines: { line: number; text: string }[] = [];

		for (const token of context.tokens) {
			if (this._prefixTokenTypes.has(token.tokenType.name)) {
				const line = (token.startLine ?? 1) - 1;
				prefixLines.push({ line, text: document.lineAt(line).text });
			}
		}

		if (prefixLines.length === 0) return edit;

		// Sort lines by extracted prefix name.
		prefixLines.sort((a, b) => {
			const prefixA = a.text.match(/(?:@?prefix\s+)(\S*:)/i)?.[1]?.toLowerCase() ?? '';
			const prefixB = b.text.match(/(?:@?prefix\s+)(\S*:)/i)?.[1]?.toLowerCase() ?? '';
			return prefixA.localeCompare(prefixB);
		});

		// Replace the prefix block with sorted lines.
		const firstLine = Math.min(...prefixLines.map(p => p.line));
		const lastLine = Math.max(...prefixLines.map(p => p.line));
		const range = new vscode.Range(
			new vscode.Position(firstLine, 0),
			new vscode.Position(lastLine, document.lineAt(lastLine).text.length)
		);

		const sortedText = prefixLines.map(p => p.text).join('\n');
		edit.replace(document.uri, range, sortedText);

		return edit;
	}

	/**
	 * Delete prefix definitions from a document.
	 * @param document The RDF document.
	 * @param prefixes The prefixes to delete.
	 */
	public async deletePrefixes(document: vscode.TextDocument, prefixes: string[]): Promise<vscode.WorkspaceEdit> {
		const context = this.contextManager.getDocumentContext(document, TurtleDocument);

		if (!context) return new vscode.WorkspaceEdit();

		const edit = new vscode.WorkspaceEdit();
		const prefixCount = Object.keys(context.namespaces).length;

		// Number of processed prefixes.
		let n = 0;

		for (let i = 0; i < context.tokens.length; i++) {
			const currentToken = context.tokens[i];

			switch (currentToken.tokenType.name) {
				case TOKENS.PREFIX.name:
				case TOKENS.TTL_PREFIX.name: {
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

					break;
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

		const context = this.contextManager.getDocumentContext(document, TurtleDocument);

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
	private async _implementPrefixes(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, context: TurtleDocument, prefixes: PrefixDefinition[]) {
		const mode = await this.configuration.get().get('prefixes.prefixDefinitionMode');

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
 * Get the token type for prefix definitions in a document. This is determined by checking the first prefix definition in the document or defaulting to the default token type if no prefix definitions are found.
 * @param document The text document.
 * @param context The RDF document context.
 * @returns The token type for prefix definitions in the document.
 */
	private _getPrefixTokenType(document: vscode.TextDocument, context: TurtleDocument): TokenType {
		if (document.languageId === 'xml') {
			return { name: 'XML_PREFIX' };
		} else {
			const hasDefaultPrefix = getFirstTokenOfType(context.tokens, this._defaultPrefixTokenType.name) !== undefined;
			const hasTurtlePrefixes = getFirstTokenOfType(context.tokens, TOKENS.TTL_PREFIX.name) !== undefined;

			if (hasTurtlePrefixes && !hasDefaultPrefix) {
				return TOKENS.TTL_PREFIX;
			} else {
				return this._defaultPrefixTokenType;
			}
		}
	}

	/**
	 * Implement a prefix for a IRI in a document using the provided token type for the prefix definition.
	 * @param tokenType The token type of the prefix definition.
	 * @param upperCase Whether the prefix should be in uppercase.
	 * @param prefix The prefix to implement.
	 * @param namespaceIri The namespace IRI for which to implement a prefix.
	 * @returns The prefix definition string.
	 */
	private _getPrefixDefinition(tokenType: TokenType, upperCase: boolean, prefix: string, namespaceIri: string): string {
		if (tokenType.name === TOKENS.PREFIX.name) {
			return `${upperCase ? 'PREFIX' : 'prefix'} ${prefix}: <${namespaceIri}>`;
		} else if (tokenType.name === TOKENS.TTL_PREFIX.name) {
			return `@prefix ${prefix}: <${namespaceIri}> .`;
		} else if (tokenType.name === 'XML_PREFIX') {
			return `xmlns:${prefix}="${namespaceIri}"`;
		} else {
			throw new Error(`Unsupported token type for prefix definition: ${tokenType}`);
		}
	}

	/**
	 * Implement missing prefixes in a document by appending the new prefixes to the end of the prefix definition list.
	 * @param document The text document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to be implemented.
	 * @param tokenType The token type of the prefix token.
	 */
	private async _implementPrefixesAppended(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, context: TurtleDocument, prefixes: PrefixDefinition[]) {
		// Insert the new prefix declaration after the last prefix declaration in the document.
		const lastPrefix = getLastTokenOfType(context.tokens, this._prefixTokenTypes);

		// Determine the token type for prefix definitions in the document and if they should be uppercase.
		const tokenType = this._getPrefixTokenType(document, context);
		const upperCase = isUpperCaseToken(lastPrefix ?? context.tokens[0]);

		let insertPosition = new vscode.Position(lastPrefix ? (lastPrefix.endLine ?? 0) : 0, 0);

		// 1. Append the new prefixes to the end of the prefix definition list.
		prefixes.sort()
			.filter(x => !context.namespaces[x.prefix] && !x.namespaceIri)
			.forEach(x => {
				const iri = x.namespaceIri ?? this.prefixLookupService.getUriForPrefix(context.uri.toString(), x.prefix);
				const definition = this._getPrefixDefinition(tokenType, upperCase, x.prefix, iri);

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
	private async _implementPrefixesSorted(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, context: TurtleDocument, prefixes: PrefixDefinition[]) {
		// 1. Delete the existing prefix definitions.
		let currentLine = 0;

		// Iterate over all tokens in the document...
		for (let token of context.tokens) {
			if (this._prefixTokenTypes.has(token.tokenType.name)) {
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
		const lastPrefix = getLastTokenOfType(context.tokens, this._prefixTokenTypes);

		if (lastPrefix) {
			this._deleteEmptyLinesAfterToken(edit, document, lastPrefix);
		}

		// 3. Implement the prefixes in a sorted order.
		const namespaceMap = { ...context.namespaces };

		for (const x of prefixes) {
			namespaceMap[x.prefix] = x.namespaceIri ?? this.prefixLookupService.getUriForPrefix(context.uri.toString(), x.prefix);
		}

		// Determine the token type for prefix definitions in the document and if they should be uppercase.
		const tokenType = this._getPrefixTokenType(document, context);
		const upperCase = isUpperCaseToken(lastPrefix ?? context.tokens[0]);

		for (const prefix of Object.keys(namespaceMap).sort()) {
			const namespaceIri = namespaceMap[prefix];
			const definition = this._getPrefixDefinition(tokenType, upperCase, prefix, namespaceIri);

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
		const context = this.contextManager.getDocumentContext(document, TurtleDocument);

		if (!context) return new vscode.WorkspaceEdit();

		// The provided IRI may be a full IRI or a namespace IRI.
		const namespaceIri = Uri.getNamespaceIri(iri);

		// Look up the prefix for the namespace IRI in the document, configuration, or default prefixes.
		let prefix = this.prefixLookupService.getPrefixForIri(document.uri.toString(), namespaceIri, 'ns');

		// Check if the prefix is already defined and if the IRI are the same.
		const existingNamspaceIri = context.namespaces[prefix];

		if (existingNamspaceIri && existingNamspaceIri !== namespaceIri) {
			// If there is a conflict, append a number to the prefix.
			let n = 1;
			let p = prefix;

			do {
				p = prefix + n;
			} while (context.namespaces[p]);

			prefix = p;
		}

		const edit = new vscode.WorkspaceEdit();

		for (let i = 0; i < context.tokens.length; i++) {
			const token = context.tokens[i];

			if (token.tokenType.name !== TOKENS.IRIREF.name || !token.image.includes(namespaceIri)) {
				continue;
			}

			if (i > 0) {
				// Do not replace the IRI in a base definition.
				const t1 = context.tokens[i - 1];

				if (this._baseTokenTypes.has(t1.tokenType.name)) {
					continue;
				}
			}

			if (i > 1) {
				// Do not replace the IRI in a prefix definition.
				const t2 = context.tokens[i - 2];

				if (this._prefixTokenTypes.has(t2.tokenType.name)) {
					continue;
				}
			}

			const localName = getIriFromIriReference(token.image).substring(namespaceIri.length);

			if (!this._isValidLocalName(localName)) {
				// Skip if the local name contains a URI characters, indicating it's not a valid prefixed name.
				// See: https://github.com/faubulous/mentor-vscode/issues/55
				continue;
			}

			const range = context.getRangeFromToken(token);

			// Delete the entire IRI token.
			edit.replace(document.uri, range, `${prefix}:${localName}`);
		}

		// Only implement the prefix if not already defined.
		if (!existingNamspaceIri || existingNamspaceIri !== namespaceIri) {
			await this._implementPrefixes(edit, document, context, [{ prefix, namespaceIri }]);
		}

		return edit;
	}

	private _isValidLocalName(localName: string): boolean {
		return /^[A-Za-z0-9_\-\.]+$/.test(localName);
	}
}