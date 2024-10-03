import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { getLastTokenOfType, isUpperCase } from '../utilities';
import { DocumentContext } from '../languages';
import { IToken } from 'millan';

/**
 * A service for declaring prefixes in RDF documents.
 */
export class PrefixDefinitionService {
	/**
	 * Implement missing prefixes in a document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to implement.
	 * @param tokenType The token type of the prefix token.
	 */
	public async implementPrefixes(document: vscode.TextDocument, prefixes: string[]) {
		const context = mentor.contexts[document.uri.toString()];

		if (!context) return;

		const mode = await mentor.configuration.get('editor.prefixDefinitionMode');

		switch (mode) {
			case 'Sorted': {
				await this.implementPrefixesSorted(document, context, prefixes);
				break;
			}
			default: {
				await this.implementPrefixesAppended(document, context, prefixes);
				break;
			}
		}
	}

	/**
	 * Delete empty lines after a token in a document.
	 * @param document The text document.
	 * @param edit The workspace edit.
	 * @param token The token after which to delete empty lines.
	 */
	protected deleteEmptyLinesAfterToken(document: vscode.TextDocument, edit: vscode.WorkspaceEdit, token: IToken) {
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
	protected async implementPrefixesAppended(document: vscode.TextDocument, context: DocumentContext, prefixes: string[]) {
		const edit = new vscode.WorkspaceEdit();

		// Get the prefix token type name from the language specific context.
		const tokenType = context.getPrefixTokenType();

		// Insert the new prefix declaration after the last prefix declaration in the document.
		const lastPrefix = getLastTokenOfType(context.tokens, tokenType);

		// Determine whether the prefixes should be in uppercase.
		const upperCase = isUpperCase(lastPrefix ?? context.tokens[0]);

		let insertPosition = new vscode.Position(lastPrefix ? (lastPrefix.endLine ?? 0) : 0, 0);

		// 1. Append the new prefixes to the end of the prefix definition list.
		prefixes.sort().filter(p => !context.namespaces[p]).forEach(prefix => {
			const uri = mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), prefix);
			const definition = context.getPrefixDefinition(prefix, uri, upperCase) + '\n';

			edit.insert(context.uri, insertPosition, definition);

			insertPosition = insertPosition.translate(1, 0);
		});

		// 2. Delete leading new lines if there are any prefixes.
		if (lastPrefix) {
			this.deleteEmptyLinesAfterToken(document, edit, lastPrefix);
		}

		// 3. Insert a new line at the end of the document if were any edits, this includes the deleted new lines.
		if (edit.size > 0) {
			edit.insert(context.uri, insertPosition, '\n');
		}

		await vscode.workspace.applyEdit(edit);
	}

	/**
	 * Implement missing prefixes in a document by maintaining a sorted list of prefixes at the beginning of the document.
	 * @param document The text document.
	 * @param context The RDF document context.
	 * @param prefixes The prefixes to be implemented.
	 * @param tokenType The token type of the prefix token.
	 */
	protected async implementPrefixesSorted(document: vscode.TextDocument, context: DocumentContext, prefixes: string[]) {
		// Get the prefix token type name from the language specific context.
		const tokenType = context.getPrefixTokenType();

		// 1. Delete the existing prefix definitions.
		let edit = new vscode.WorkspaceEdit();

		for (let token of context.tokens.filter(token => token.tokenType?.tokenName === tokenType)) {
			const startLine = (token.startLine ?? 1) - 1;
			const start = new vscode.Position(startLine, 0);
			const end = new vscode.Position(startLine + 1, 0);

			edit.delete(context.uri, new vscode.Range(start, end));
		}

		// 2. Delete leading new lines and insert a new line at the beginning of the document.
		const lastPrefix = getLastTokenOfType(context.tokens, tokenType);

		if (lastPrefix) {
			this.deleteEmptyLinesAfterToken(document, edit, lastPrefix);
		}

		// 3. Implement the prefixes in a sorted order.
		const sortedPrefixes = [...Object.keys(context.namespaces), ...prefixes].sort();

		// Determine whether the prefixes should be in uppercase.
		const upperCase = isUpperCase(lastPrefix ?? context.tokens[0]);

		for (let prefix of sortedPrefixes) {
			const uri = context.namespaces[prefix] ?? mentor.prefixLookupService.getUriForPrefix(context.uri.toString(), prefix);
			const definition = context.getPrefixDefinition(prefix, uri, upperCase);

			edit.insert(context.uri, new vscode.Position(0, 0), definition + '\n');
		}

		edit.insert(context.uri, new vscode.Position(0, 0), '\n');

		await vscode.workspace.applyEdit(edit);
	}
}