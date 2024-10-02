import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { getLastTokenOfType, getNextToken, isUpperCase } from '../utilities';
import { DocumentContext } from '../languages';

/**
 * The mode of defining prefixes in RDF documents.
 */
export enum PrefixDefinitionMode {
	/** Append new prefixes to the end of prefix definition list at the beginning of the document. */
	Append,
	/** Maintain a sorted list of prefixes at the beginning of the document. */
	Sorted
};

/**
 * A service for declaring prefixes in RDF documents.
 */
export class PrefixDefinitionService {

	/**
	 * The mode of defining prefixes in RDF documents.
	 */
	definitionMode: PrefixDefinitionMode = PrefixDefinitionMode.Sorted;

	/**
	 * Implement missing prefixes in a document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to implement.
	 * @param tokenType The token type of the prefix token.
	 */
	public async implementPrefixes(context: DocumentContext, prefixes: string[]) {
		if (this.definitionMode === PrefixDefinitionMode.Append) {
			await this.implementAppendedPrefixes(context, prefixes);
		} else {
			await this.implementSortedPrefixes(context, prefixes);
		}
	}

	protected async implementAppendedPrefixes(context: DocumentContext, prefixes: string[]) {
		const tokenType = context.getPrefixTokenType();

		// Determine whether the prefixes should be in uppercase.
		const upperCase = isUpperCase(getLastTokenOfType(context.tokens, tokenType) ?? context.tokens[0]);

		// Insert the new prefix declaration after the last prefix declaration in the document.
		const lastPrefix = getLastTokenOfType(context.tokens, tokenType);

		// The line number where to insert the new prefix declaration.
		let n = lastPrefix ? (lastPrefix.endLine ?? 0) : 0;

		const edit = new vscode.WorkspaceEdit();

		for (let prefix of prefixes.filter(p => !context.namespaces[p])) {
			const uri = mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), prefix);
			const definition = context.getPrefixDefinition(prefix, uri, upperCase) + '\n';

			edit.insert(context.uri, new vscode.Position(n, 0), definition);

			n += 1;
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

		await vscode.workspace.applyEdit(edit);
	}

	protected async implementSortedPrefixes(context: DocumentContext, prefixes: string[]) {
		const tokenType = context.getPrefixTokenType();

		// Determine whether the prefixes should be in uppercase.
		const upperCase = isUpperCase(getLastTokenOfType(context.tokens, tokenType) ?? context.tokens[0]);

		// 1. Delete the existing prefix definitions.
		let edit = new vscode.WorkspaceEdit();

		for (let token of context.tokens.filter(token => token.tokenType?.tokenName === tokenType)) {
			const startLine = (token.startLine ?? 1) - 1;
			const start = new vscode.Position(startLine, 0);
			const end = new vscode.Position(startLine + 1, 0);

			edit.delete(context.uri, new vscode.Range(start, end));
		}

		// 2. Implement the prefixes in a sorted order.
		const sortedPrefixes = [...Object.keys(context.namespaces), ...prefixes].sort();

		for (let prefix of sortedPrefixes) {
			const uri = context.namespaces[prefix] ?? mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), prefix);
			const definition = context.getPrefixDefinition(prefix, uri, upperCase);

			edit.insert(context.uri, new vscode.Position(0, 0), definition + '\n');
		}

		await vscode.workspace.applyEdit(edit);
	}
}