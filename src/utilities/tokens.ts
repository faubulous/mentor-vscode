/**
 * Note: Do not add import from 'vscode' here. This file is used in the 
 * language server where vscode is not available.
 */
import { IToken } from "chevrotain";
import { TOKENS } from "@faubulous/mentor-rdf-parsers";
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
	switch (token.tokenType.name) {
		case TOKENS.IRIREF.name:
			return getIriFromIriReference(token.image);
		case TOKENS.PNAME_LN.name:
		case TOKENS.PNAME_NS.name:
			return getIriFromPrefixedName(prefixes, token.image);
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
	if (token?.tokenType.name !== TOKENS.PREFIX.name && token?.tokenType.name !== TOKENS.TTL_PREFIX.name) {
		return;
	}

	const n = tokens.indexOf(token);

	if (n >= tokens.length - 2) {
		return;
	}

	const prefixToken = tokens[n + 1];

	if (prefixToken?.tokenType.name !== TOKENS.PNAME_NS.name) {
		return;
	}

	const uriToken = tokens[n + 2];

	if (uriToken?.tokenType.name !== TOKENS.IRIREF.name) {
		return;
	}

	const prefix = prefixToken.image.substring(0, prefixToken.image.length - 1);
	const uri = getIriFromIriReference(uriToken.image);

	return { prefix, uri };
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
		case TOKENS.PERIOD.name: {
			// A dot is always followed by a subject.
			return "subject";
		}
		case TOKENS.SEMICOLON.name: {
			// A semicolon is always followed by a predicate.
			return "predicate";
		}
		case TOKENS.A.name: {
			// A type assertion is always followed by an object.
			return "object";
		}
		case TOKENS.PNAME_LN.name:
		case TOKENS.IRIREF.name: {
			// This could either be a predicate or an object.
			const q = tokens[tokenIndex - 2];

			switch (q?.tokenType.name) {
				case TOKENS.SEMICOLON.name:
				case TOKENS.LBRACKET.name:
				case TOKENS.PNAME_LN.name:
				case TOKENS.IRIREF.name: {
					return "object";
				}
				case TOKENS.PERIOD.name: {
					return "predicate";
				}
			}
		}
	}
}