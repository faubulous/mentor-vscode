/**
 * Note: Do not add import from 'vscode' here. This file is used in the 
 * language server where vscode is not available.
 */
import { IToken } from "millan";

export interface NamespaceMap {
	[key: string]: string;
}

export interface NamespaceDefinition {
	prefix: string;
	uri: string;
}

export interface LiteralDefinition {
	token: IToken;
	language?: string;
	datatype?: string;
}

export interface TokenPosition {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
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
export function getTokenPosition(token: IToken): TokenPosition {
	return {
		startLine: token.startLine ? token.startLine - 1 : 0,
		startColumn: token.startColumn ? token.startColumn - 1 : 0,
		endLine: token.endLine ? token.endLine - 1 : 0,
		endColumn: token.endColumn ? token.endColumn : 0
	};
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
	} else {
		throw new Error("Cannot get prefix from token type: " + token.tokenType?.tokenName);
	}
}

/**
 * Get the URI from IRI or prefixed name tokens.
 * @param token A token.
 * @returns A URI or undefined.
 */
export function getUriFromToken(namespaces: NamespaceMap, token: IToken): string | undefined {
	const tokenName = token.tokenType?.tokenName;

	switch (tokenName) {
		case 'IRIREF':
			return getUriFromIriReference(token.image);
		case 'PNAME_LN':
		case 'PNAME_NS':
			return getUriFromPrefixedName(namespaces, token.image);
	}
}

/**
 * Get the URI from an IRI reference.
 * @param value A URI reference.
 * @returns A URI string wihout angle brackets.
 */
export function getUriFromIriReference(value: string): string {
	const v = value.trim();

	if (v.length >= 2 && v.startsWith('<') && v.endsWith('>')) {
		return v.substring(1, v.length - 1);
	} else {
		return v;
	}
}

/*
 * Get the URI from a prefixed name.
 * @param name A prefixed name.
 * @returns A URI string.
 */
export function getUriFromPrefixedName(namespaces: NamespaceMap, name: string): string | undefined {
	const parts = name.split(':');

	if (parts.length == 2) {
		const prefix = parts[0];
		const label = parts[1];

		if (namespaces[prefix]) {
			return namespaces[prefix] + label;
		}
	}
}

/**
 * Get the last token of a given type.
 * @param tokens A list of tokens.
 * @param type The type name of the token.
 * @returns The last token of the given type, if it exists, undefined otherwise.
 */
export function getLastTokenOfType(tokens: IToken[], type: string): IToken | undefined {
	const result = tokens.filter(t => t.tokenType?.tokenName === type);

	if (result.length > 0) {
		return result[result.length - 1];
	}
}

/*
 * Get the URI from a prefixed name.
 * @param name A prefixed name.
 * @returns A URI string.
 */
export function getNamespaceUriFromPrefixedName(namespaces: NamespaceMap, name: string): string | undefined {
	const parts = name.split(':');

	if (parts.length == 2) {
		const prefix = parts[0];

		return namespaces[prefix];
	}
}

/**
 * Get the namespace definition from a list of tokens.
 * @param tokens The document tokens.
 * @param token A prefix name declaration token.
 * @returns A namespace definition or undefined.
 */
export function getNamespaceDefinition(tokens: IToken[], token: IToken): NamespaceDefinition | undefined {
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
	const uri = getUriFromIriReference(uriToken.image);

	return { prefix, uri };
}

export function getUnquotedLiteralValue(token: IToken): string {
	switch (token?.tokenType?.tokenName) {
		case "STRING_LITERAL_QUOTE":
		case "STRING_LITERAL_SINGLE_QUOTE":
			return token.image.substring(1, token.image.length - 1);
		case "STRING_LITERAL_LONG_QUOTE":
			return token.image.substring(3, token.image.length - 3);
	}

	return token.image;
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