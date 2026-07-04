/**
 * Note: Do not add import from 'vscode' here. This file is used in the 
 * language server where vscode is not available.
 */
import { RDF } from "@faubulous/mentor-rdf";
import { IToken, RdfToken } from "@faubulous/mentor-rdf-parsers";
import { Range } from "vscode-languageserver-types";
import { countLeadingWhitespace, countTrailingWhitespace } from "./string";

/**
 * A zero-based position in a document (compatible with `vscode.Position` and LSP `Position`).
 */
export interface TokenPosition {
	line: number;
	character: number;
}

/**
 * Maps namespace IRIs to prefixes.
 */
export interface NamespaceMap {
	[key: string]: string;
}

/**
 * Maps namespace prefixes to IRIs.
 */
export interface PrefixMap {
	[key: string]: string;
}

/**
 * A tuple of a namespace prefix and an associated IRI.
 */
export interface PrefixDefinition {
	prefix: string;
	uri: string;
}

/**
* Gets the position of a token in a document.
* @param token A token.
* @returns The position of the token.
*/
export function getTokenPosition(token: IToken): Range {
	return {
		start: {
			line: token.startLine ? token.startLine - 1 : 0,
			character: token.startColumn ? token.startColumn - 1 : 0,
		},
		end: {
			line: token.endLine ? token.endLine - 1 : 0,
			character: token.endColumn ? token.endColumn : 0
		}
	};
}

/**
 * Gets the index of the token at a given position.
 * @param tokens The document tokens.
 * @param position A zero-based position in the document (e.g. a vscode.Position or LSP Position).
 * @returns The index of the token at the given position, or -1 if no token is found.
 */
export function getTokenIndexAtPosition(tokens: IToken[], position: { line: number; character: number }): number {
	// The tokens are 1-based, but the position is 0-based.
	const l = position.line + 1;
	const n = position.character;

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];

		if (!token.startLine || !token.endLine || !token.startColumn || !token.endColumn) {
			continue;
		}

		if (token.startLine > l) {
			break;
		}

		// If the token starts and ends on the same line and column, then the position must be inside the token.
		if (token.startLine == l && token.endLine == l && token.startColumn <= n && n <= token.endColumn) {
			return i;
		}

		// If we have a multi-line token and the position is between start and end, then we have a match.
		if (token.startLine < l && token.endLine > l) {
			return i;
		}

		// If the token ends on the same line and the position is before the end column, then we have a match.
		if (token.endLine == l && token.endColumn >= n) {
			return i;
		}
	}

	return -1;
}

/**
 * Gets the first token at a given position.
 * @param tokens The document tokens.
 * @param position A zero-based position in the document.
 * @returns The token at the given position, if it exists, undefined otherwise.
 */
export function getTokenAtPosition(tokens: IToken[], position: TokenPosition): IToken | undefined {
	const index = getTokenIndexAtPosition(tokens, position);

	return index >= 0 ? tokens[index] : undefined;
}

/**
 * Gets the token that precedes the given position.
 * @param tokens The document tokens.
 * @param position A zero-based position in the document.
 * @returns The token before the given position, if it exists, undefined otherwise.
 */
export function getTokenBeforePosition(tokens: IToken[], position: TokenPosition): IToken | undefined {
	const index = getTokenIndexAtPosition(tokens, position);

	if (index > 0) {
		// Found token at position, return previous one
		return tokens[index - 1];
	} else if (index === 0) {
		// At first token, no previous token
		return undefined;
	} else {
		// No token at position (index === -1), find last token before this position
		const l = position.line + 1;
		const n = position.character;

		for (let i = tokens.length - 1; i >= 0; i--) {
			const token = tokens[i];

			if (!token.endLine || !token.endColumn) continue;

			// If token ends before the cursor position, it's the one we want
			if (token.endLine < l || (token.endLine === l && token.endColumn <= n)) {
				return token;
			}
		}
	}

	return undefined;
}

/**
 * Indicates whether the token at the given position is a namespace prefix.
 * @param token A token.
 * @param position The position in the document.
 * @returns `true` if the cursor is on the prefix of the token, `false` otherwise.
 */
export function isPrefixTokenAtPosition(token: IToken, position: TokenPosition): boolean {
	const { start } = getTokenPosition(token);

	switch (token.tokenType.name) {
		case RdfToken.PNAME_NS.name:
		case RdfToken.PNAME_LN.name: {
			const i = token.image.indexOf(":");
			const n = position.character - start.character;

			return n <= i;
		}
		default: {
			return false;
		}
	}
}

/**
 * Gets the whitespace-adjusted range of a token as an LSP `Range`.
 *
 * The millan parser incorrectly parses some tokens with leading and trailing whitespace;
 * the start and end positions are adjusted to account for this.
 * @param token A token.
 * @returns The range covering the token's non-whitespace content.
 */
export function getTokenRange(token: IToken): Range {
	const startLine = token.startLine ? token.startLine - 1 : 0;
	const startCharacter = token.startColumn ? token.startColumn - 1 : 0;
	const startWhitespace = countLeadingWhitespace(token.image);

	const endLine = token.endLine ? token.endLine - 1 : 0;
	const endCharacter = token.endColumn ? token.endColumn - 1 : 0;
	const endWhitespace = countTrailingWhitespace(token.image);

	return {
		start: {
			line: startLine,
			character: startCharacter + startWhitespace
		},
		end: {
			line: endLine,
			character: endCharacter - endWhitespace + 1
		}
	};
}

/**
 * Get the IRI from either an IRI or prefixed name tokens.
 * @param token A token.
 * @returns A URI or undefined.
 */
export function getIriFromToken(prefixes: PrefixMap, token: IToken): string | undefined {
	if (token.tokenType.name === RdfToken.IRIREF.name) {
		return getIriFromIriReference(token.image);
	} else if (token.tokenType.name === RdfToken.PNAME_LN.name || token.tokenType.name === RdfToken.PNAME_NS.name) {
		return getIriFromPrefixedName(prefixes, token.image);
	} else if (token.payload?.blankNodeId) {
		return token.payload.blankNodeId;
	}
}

/**
 * Get the URI from an IRI reference.
 * @param value A URI reference.
 * @returns A URI string wihout angle brackets.
 */
export function getIriFromIriReference(value: string): string {
	const v = value.trim();

	if (v.length >= 2 && v.startsWith('<') && v.endsWith('>')) {
		return v.substring(1, v.length - 1);
	} else {
		return v;
	}
}

/*
 * Get the IRI from a prefixed name.
 * @param name A prefixed name.
 * @returns A IRI string.
 */
export function getIriFromPrefixedName(prefixes: PrefixMap, name: string): string | undefined {
	const parts = name.split(':');

	if (parts.length == 2) {
		const prefix = parts[0];
		const label = parts[1];

		if (prefixes[prefix]) {
			return prefixes[prefix] + label;
		}
	}
}

/*
 * Get the IRI from a prefixed name.
 * @param name A prefixed name.
 * @returns A IRI string.
 */
export function getNamespaceIriFromPrefixedName(prefixes: PrefixMap, name: string): string | undefined {
	const parts = name.split(':');

	if (parts.length == 2) {
		const prefix = parts[0];

		return prefixes[prefix];
	}
}

/**
 * Get the namespace definition from a list of tokens.
 * @param tokens The document tokens.
 * @param token A prefix name declaration token.
 * @returns A namespace definition or undefined.
 */
export function getNamespaceDefinition(tokens: IToken[], token: IToken): PrefixDefinition | undefined {
	if (token?.tokenType.name !== RdfToken.PREFIX.name && token?.tokenType.name !== RdfToken.TTL_PREFIX.name) {
		return;
	}

	const n = tokens.indexOf(token);

	if (n >= tokens.length - 2) {
		return;
	}

	const prefixToken = tokens[n + 1];

	if (prefixToken?.tokenType.name !== RdfToken.PNAME_NS.name) {
		return;
	}

	const uriToken = tokens[n + 2];

	if (uriToken?.tokenType.name !== RdfToken.IRIREF.name) {
		return;
	}

	const prefix = prefixToken.image.substring(0, prefixToken.image.length - 1);
	const uri = getIriFromIriReference(uriToken.image);

	return { prefix, uri };
}

/**
 * Get the unquoted string value from a literal token.
 * Strips the surrounding quote characters from single-quoted, double-quoted,
 * and long (triple-quoted) string literal tokens.
 * @param token A literal token.
 * @returns The unquoted string value.
 */
export function getUnquotedLiteralValue(token: IToken): string {
	switch (token?.tokenType.name) {
		case RdfToken.STRING_LITERAL_QUOTE.name:
		case RdfToken.STRING_LITERAL_SINGLE_QUOTE.name:
			return token.image.substring(1, token.image.length - 1);
		case RdfToken.STRING_LITERAL_LONG_QUOTE.name:
		case RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name:
			return token.image.substring(3, token.image.length - 3);
	}

	return token.image;
}

export type TripleComonentType = "subject" | "predicate" | "object" | undefined;

export function getTripleComponentType(tokens: IToken[], tokenIndex: number): TripleComonentType {
	if (tokenIndex < 1) {
		// If there is no previous token, we are at the beginning of the document.
		// It must either be followed by a prefix declaration or a subject.
		return "subject";
	}

	const p = tokens[tokenIndex - 1];

	switch (p.tokenType.name) {
		case RdfToken.PERIOD.name: {
			// A dot is always followed by a subject.
			return "subject";
		}
		case RdfToken.LCURLY.name: {
			// The start of a SPARQL group graph pattern is followed by a subject.
			return "subject";
		}
		case RdfToken.SEMICOLON.name: {
			// A semicolon is always followed by a predicate.
			return "predicate";
		}
		case RdfToken.A.name: {
			// A type assertion is always followed by an object.
			return "object";
		}
		case RdfToken.VAR1.name:
		case RdfToken.VAR2.name: {
			// A SPARQL variable can be a subject or a predicate; disambiguate by
			// looking at the token before it.
			const q = tokens[tokenIndex - 2];

			switch (q?.tokenType.name) {
				case undefined:
				case RdfToken.PERIOD.name:
				case RdfToken.LCURLY.name: {
					// The variable opened a triple pattern → it was the subject.
					return "predicate";
				}
				case RdfToken.VAR1.name:
				case RdfToken.VAR2.name:
				case RdfToken.PNAME_LN.name:
				case RdfToken.IRIREF.name:
				case RdfToken.SEMICOLON.name: {
					// The variable followed a subject or a semicolon → it was the predicate.
					return "object";
				}
			}
			break;
		}
		case RdfToken.PNAME_LN.name:
		case RdfToken.IRIREF.name: {
			// This could either be a predicate or an object.
			const q = tokens[tokenIndex - 2];

			switch (q?.tokenType.name) {
				case RdfToken.SEMICOLON.name:
				case RdfToken.LBRACKET.name:
				case RdfToken.PNAME_LN.name:
				case RdfToken.IRIREF.name:
				case RdfToken.VAR1.name:
				case RdfToken.VAR2.name: {
					return "object";
				}
				case RdfToken.PERIOD.name: {
					return "predicate";
				}
			}
		}
	}
}

/**
 * Indicates whether the token at the given index is the object of a type
 * assertion, i.e. whether the preceding predicate is the `a` keyword or
 * an IRI / prefixed name that resolves to `rdf:type`.
 * @param tokens The document tokens.
 * @param tokenIndex The index of the (object) token to check.
 * @param prefixes The namespace prefixes defined in the document, used to expand prefixed names.
 * @returns `true` if the preceding predicate asserts an rdf:type relation.
 */
export function isTypeAssertionObject(tokens: IToken[], tokenIndex: number, prefixes: PrefixMap): boolean {
	const p = tokens[tokenIndex - 1];

	if (!p) {
		return false;
	}

	switch (p.tokenType.name) {
		case RdfToken.A.name: {
			return true;
		}
		case RdfToken.PNAME_LN.name: {
			return getIriFromPrefixedName(prefixes, p.image) === RDF.type;
		}
		case RdfToken.IRIREF.name: {
			return getIriFromIriReference(p.image) === RDF.type;
		}
		default: {
			return false;
		}
	}
}