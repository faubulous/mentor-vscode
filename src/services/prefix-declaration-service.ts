import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { PrefixLookupService } from './prefix-lookup-service';
import { getLastTokenOfType, getNextToken } from '../utilities';

/**
 * A service for declaring prefixes in RDF documents.
 */
export class PrefixDeclarationService {
	/*
	 * Indicates whether the service should automatically declare missing prefixes.
	 */
	private _enabled = true;

	/*
	 * Indicates whether the service should automatically declare missing prefixes.
	 */
	get enabled(): boolean {
		return this._enabled;
	}

	/**
	 * Enable automatic prefix declaration.
	 */
	enable() {
		this._enabled = true;
	}

	/**
	 * Disable automatic prefix declaration.
	 */
	disable() {
		this._enabled = false;
	}

	/*
	 * Indicates whether the service is suspended.
	 */
	private _suspended = false;

	/*
	 * Indicates whether the service is suspended.
	 */
	get suspended(): boolean {
		return this._suspended;
	}

	/**
	 * Suspend automatic prefix declaration.
	 */
	suspend() {
		this._suspended = true;
	}

	/**
	 * Resume automatic prefix declaration.
	 */
	resume() {
		this._suspended = false;
	}

	/**
	 * Get the missing prefixes from a list of diagnostics.
	 * @param document A text document.
	 * @param diagnostics A list of diagnostics to get the missing prefixes from.
	 * @returns An array of missing prefix definitions.
	 */
	public getMissingPrefixes(document: vscode.TextDocument, diagnostics: Iterable<vscode.Diagnostic>): string[] {
		const result = new Set<string>();

		for (let diagnostic of diagnostics) {
			if (diagnostic.code === 'NoNamespacePrefixError') {
				const prefix = document.getText(diagnostic.range).split(':')[0];

				if (prefix !== undefined) {
					result.add(prefix);
				}
			}
		}

		return Array.from(result);
	}

	/**
	 * Implement missing prefixes in a document.
	 * @param documentUri The URI of the document to fix the prefixes in.
	 * @param prefixes The prefixes to implement.
	 * @param tokenType The token type of the prefix token.
	 * @param defineCallback A callback that provides the prefix declaration.
	 */
	public fixMissingPrefixes(documentUri: string, prefixes: string[], tokenType: string, defineCallback: (prefix: string, uri: string) => string) {
		if (!this._enabled || this._suspended) {
			return;
		}

		const document = mentor.contexts[documentUri];

		if (document) {
			const edit = new vscode.WorkspaceEdit();

			const prefixLookupService = new PrefixLookupService();

			// Implement the prefixes in a sorted order.
			const sortedPrefixes = prefixes.sort();

			// Insert the new prefix declaration after the last prefix declaration in the document.
			const lastPrefix = getLastTokenOfType(document.tokens, tokenType);

			// The line number where to insert the new prefix declaration.
			let n = lastPrefix ? (lastPrefix.endLine ?? 0) : 0;

			for (let i = 0; i < sortedPrefixes.length; i++) {
				const prefix = sortedPrefixes[i];
				const uri = prefixLookupService.getUriForPrefix(documentUri, prefix);

				edit.insert(document.uri, new vscode.Position(n, 0), defineCallback(prefix, uri));
			}

			if (lastPrefix) {
				const nextToken = getNextToken(document.tokens, lastPrefix);

				// Insert a new line between the last prefix declaration and the next token.
				if (nextToken && nextToken.endLine === n + 1) {
					edit.insert(document.uri, new vscode.Position(n, 0), '\n');
				}
			} else {
				const firstToken = document.tokens[0];

				// Insert a new line at the beginning of the document.
				if (firstToken && firstToken.endLine == 1) {
					edit.insert(document.uri, new vscode.Position(n, 0), '\n');
				}
			}

			vscode.workspace.applyEdit(edit);
		}
	}
}