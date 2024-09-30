import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { getLastTokenOfType, getNextToken, isUpperCase } from '../utilities';
import { DocumentContext } from '../languages';

/**
 * A service for declaring prefixes in RDF documents.
 */
export class PrefixDeclarationService {
	/**
	 * Implement missing prefixes in a document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to implement.
	 * @param tokenType The token type of the prefix token.
	 */
	public implementPrefixes(context: DocumentContext, prefixes: string[]) {
		const edit = new vscode.WorkspaceEdit();

		const tokenType = context.getPrefixTokenType();

		// Determine whether the prefixes should be in uppercase.
		let upperCase = isUpperCase(getLastTokenOfType(context.tokens, tokenType));
		upperCase = upperCase || isUpperCase(context.tokens[0]);

		// Implement the prefixes in a sorted order.
		const sortedPrefixes = prefixes.sort();

		// Insert the new prefix declaration after the last prefix declaration in the document.
		const lastPrefix = getLastTokenOfType(context.tokens, tokenType);

		// The line number where to insert the new prefix declaration.
		let n = lastPrefix ? (lastPrefix.endLine ?? 0) : 0;

		for (let i = 0; i < sortedPrefixes.length; i++) {
			const prefix = sortedPrefixes[i];

			if (context.namespaceDefinitions[prefix]) {
				// Do not implment prefixes that are already defined.
				continue;
			}

			const uri = mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), prefix);

			const declaration = context.getPrefixDeclaration(prefix, uri, upperCase);

			edit.insert(context.uri, new vscode.Position(n, 0), declaration);
		}

		if (lastPrefix) {
			const nextToken = getNextToken(context.tokens, lastPrefix);

			// Insert a new line between the last prefix declaration and the next token.
			if (nextToken && nextToken.endLine === n + 1) {
				edit.insert(context.uri, new vscode.Position(n, 0), '\n');
			}
		} else {
			const firstToken = context.tokens[0];

			// Insert a new line at the beginning of the document.
			if (firstToken && firstToken.endLine == 1) {
				edit.insert(context.uri, new vscode.Position(n, 0), '\n');
			}
		}

		vscode.workspace.applyEdit(edit);
	}
}