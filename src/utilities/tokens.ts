/**
 * Note: Do not add import from 'vscode' here. This file is used in the 
 * language server where vscode is not available.
 */
import { IToken } from "millan";
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
 * Get the next token.
 * @param token A token.
 * @returns The next token or undefined.
 */
export function getNextToken(tokens: IToken[], token: IToken): IToken | undefined {
	const index = tokens.indexOf(token);

	if (index > -1 && index < tokens.length - 1) {
		return tokens[index + 1];
	}
}

/**
 * Get the previous token.
 * @param token A token.
 * @returns The previous token or undefined.
 */
export function getPreviousToken(tokens: IToken[], token: IToken): IToken | undefined {
	const index = tokens.indexOf(token);

	if (index > 0) {
		return tokens[index - 1];
	}
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

/*
 * Get the token at a given offset.
 * @param tokens A list of tokens.
 * @param offset An offset.
 * @returns The token at the given offset.
 */
export function getTokenAtOffset(tokens: IToken[], offset: number): IToken[] {
	return tokens.filter(t => t.startOffset <= offset && offset <= t.startOffset + t.image.length);
}

/**
 * Indicates whether the token is a variable.
 * @param token A token.
 * @returns true if the token is a variable, false otherwise.
 */
export function isVariable(token: IToken) {
	const tokenType = token.tokenType?.tokenName;

	return tokenType === "VAR1";
}

/**
 * Indicates whether a token is upper case.
 * @param token A token.
 * @returns `true` if the token is upper case. `false` otherwise.
 */
export function isUpperCase(token?: IToken): boolean {
	if (token) {
		const image = token.image;

		if (image) {
			return image === image.toUpperCase();
		}
	}

	return false;
}

/**
 * Get the prefix name from a prefixed name token.
 */
export function getPrefixFromToken(token: IToken): string {
	if (token.tokenType?.tokenName === 'PNAME_LN') {
		return token.image.split(':')[0];
	} else if (token.tokenType?.tokenName === 'PNAME_NS') {
		return token.image.substring(0, token.image.length - 1);
	} else {
		throw new Error("Cannot get prefix from token type: " + token.tokenType?.tokenName);
	}
}

/**
 * Get the IRI from either an IRI or prefixed name tokens.
 * @param token A token.
 * @returns A URI or undefined.
 */
export function getIriFromToken(prefixes: PrefixMap, token: IToken): string | undefined {
	const tokenName = token.tokenType?.tokenName;

	switch (tokenName) {
		case 'IRIREF':
			return getIriFromIriReference(token.image);
		case 'PNAME_LN':
		case 'PNAME_NS':
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
	if (token?.tokenType?.tokenName != "PREFIX" && token?.tokenType?.tokenName != "TTL_PREFIX") {
		return;
	}

	const n = tokens.indexOf(token);

	if (n >= tokens.length - 2) {
		return;
	}

	const prefixToken = tokens[n + 1];

	if (prefixToken?.tokenType?.tokenName != "PNAME_NS") {
		return;
	}

	const uriToken = tokens[n + 2];

	if (uriToken?.tokenType?.tokenName != "IRIREF") {
		return;
	}

	const prefix = prefixToken.image.substring(0, prefixToken.image.length - 1);
	const uri = getIriFromIriReference(uriToken.image);

	return { prefix, uri };
}

export function getTripleComponentType(tokens: IToken[], token: IToken): "subject" | "predicate" | "object" | undefined {
	const p = getPreviousToken(tokens, token);

	if (!p) {
		// If there is no previous token, we are at the beginning of the document.
		// It must either be followed by a prefix declaration or a subject.
		return "subject";
	}

	switch (p.tokenType?.tokenName) {
		case "Period":
		case "Dot": {
			// A dot is always followed by a subject.
			return "subject";
		}
		case "Semicolon": {
			// A semicolon is always followed by a predicate.
			return "predicate";
		}
		case "A": {
			// A type assertion is always followed by an object.
			return "object";
		}
		case "PNAME_LN":
		case "IRIREF": {
			// This could either be a predicate or an object.
			const q = getPreviousToken(tokens, p);

			switch (q?.tokenType?.tokenName) {
				case "Semicolon":
				case "LBracket":
				case "PNAME_LN":
				case "IRIREF": {
					return "object";
				}
				case "Period":
				case "Dot": {
					return "predicate";
				}
			}
		}
	}
}