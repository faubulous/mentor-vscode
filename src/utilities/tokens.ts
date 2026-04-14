/**
 * Note: Do not add import from 'vscode' here. This file is used in the 
 * language server where vscode is not available.
 */
import { IToken, RdfToken } from "@faubulous/mentor-rdf-parsers";
import { Range } from "vscode-languageserver-types";

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
		case RdfToken.SEMICOLON.name: {
			// A semicolon is always followed by a predicate.
			return "predicate";
		}
		case RdfToken.A.name: {
			// A type assertion is always followed by an object.
			return "object";
		}
		case RdfToken.PNAME_LN.name:
		case RdfToken.IRIREF.name: {
			// This could either be a predicate or an object.
			const q = tokens[tokenIndex - 2];

			switch (q?.tokenType.name) {
				case RdfToken.SEMICOLON.name:
				case RdfToken.LBRACKET.name:
				case RdfToken.PNAME_LN.name:
				case RdfToken.IRIREF.name: {
					return "object";
				}
				case RdfToken.PERIOD.name: {
					return "predicate";
				}
			}
		}
	}
}