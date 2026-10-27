/**
 * The kinds of token a statement line is made of.
 */
export type LineTokenKind = 'ws' | 'punct' | 'name' | 'iri' | 'lang' | 'lit' | 'hole';

/**
 * What every token carries: its raw text and where it starts on the line.
 */
interface LineTokenBase {
	/**
	 * The raw text of the token as written on the line.
	 */
	text: string;

	/**
	 * The offset of the first character of the token.
	 */
	start: number;
}

/**
 * A run of spaces or tabs.
 */
export interface WhitespaceToken extends LineTokenBase {
	kind: 'ws';
}

/**
 * A separator or a list bracket: `,`, `;`, `(` or `)`.
 */
export interface PunctuationToken extends LineTokenBase {
	kind: 'punct';
}

/**
 * A prefixed name, the keyword `a`, or any other bare word such as `42` or `true`.
 */
export interface NameToken extends LineTokenBase {
	kind: 'name';
}

/**
 * An IRI reference written `<…>`. The text keeps the angle brackets; the closing one may be
 * missing while the IRI is being typed.
 */
export interface IriToken extends LineTokenBase {
	kind: 'iri';
}

/**
 * A language tag such as `@en` that is not attached to a literal.
 */
export interface LanguageToken extends LineTokenBase {
	kind: 'lang';
}

/**
 * A quoted literal, with the language tag or datatype written after it, or a language tag
 * written before it (`@en "text"`), which the canonical form moves behind.
 */
export interface LiteralToken extends LineTokenBase {
	kind: 'lit';

	/**
	 * The text between the quotes, with its Turtle escapes kept.
	 */
	value: string;

	/**
	 * The language tag without its `@`.
	 */
	lang?: string;

	/**
	 * The datatype as written after `^^`: a prefixed name or an `<iri>`.
	 */
	datatype?: string;

	/**
	 * Whether the closing quote has been typed.
	 */
	closed: boolean;

	/**
	 * Whether the language tag was written before the opening quote.
	 */
	langPre?: boolean;

	/**
	 * The offset of the opening quote.
	 */
	quoteStart: number;

	/**
	 * The offset of the closing quote, or -1 while the literal is unclosed.
	 */
	quoteEnd: number;

	/**
	 * The whitespace between a leading language tag and the opening quote.
	 */
	gap: string;

	/**
	 * The raw `@lang` or `^^datatype` text that follows the closing quote.
	 */
	suffix: string;
}

/**
 * A placeholder for a blank node: `[…]`, `[]` or `[ ]`.
 */
export interface HoleToken extends LineTokenBase {
	kind: 'hole';
}

/**
 * A token of a statement line.
 */
export type LineToken =
	| WhitespaceToken
	| PunctuationToken
	| NameToken
	| IriToken
	| LanguageToken
	| LiteralToken
	| HoleToken;

/**
 * One value of a statement line: a single term, or a list `( … )` whose items are kept together
 * so padding, canonical form and statement text treat the list as one value.
 */
export interface ValueGroup {
	/**
	 * The term, or the items of the list without its brackets.
	 */
	items: LineToken[];

	/**
	 * Whether the group is a list.
	 */
	list: boolean;

	/**
	 * The offset of the first character of the group.
	 */
	start: number;

	/**
	 * The offset after the last character of the group.
	 */
	end: number;
}
