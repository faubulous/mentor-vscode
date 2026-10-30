/**
 * The kinds of token a statement text is made of.
 */
export type StatementTokenKind = 'whitespace' | 'punctuation' | 'name' | 'iri' | 'languageTag' | 'literal' | 'nestedNode';

/**
 * What every token carries: its raw text and where it starts in the statement text.
 */
interface StatementTokenBase {
	/**
	 * The raw text of the token as written in the statement text.
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
export interface WhitespaceToken extends StatementTokenBase {
	kind: 'whitespace';
}

/**
 * A separator or a list bracket: `,`, `;`, `(` or `)`.
 */
export interface PunctuationToken extends StatementTokenBase {
	kind: 'punctuation';
}

/**
 * A prefixed name, the keyword `a`, or any other bare word such as `42` or `true`.
 */
export interface NameToken extends StatementTokenBase {
	kind: 'name';
}

/**
 * An IRI reference written `<…>`. The text keeps the angle brackets; the closing one may be
 * missing while the IRI is being typed.
 */
export interface IriToken extends StatementTokenBase {
	kind: 'iri';
}

/**
 * A language tag such as `@en` that is not attached to a literal.
 */
export interface LanguageToken extends StatementTokenBase {
	kind: 'languageTag';
}

/**
 * A quoted literal, with the language tag or datatype written after it, or a language tag
 * written before it (`@en "text"`), which the canonical form moves behind.
 */
export interface LiteralToken extends StatementTokenBase {
	kind: 'literal';

	/**
	 * The text between the quotes, with its Turtle escapes kept.
	 */
	value: string;

	/**
	 * The language tag without its `@`.
	 */
	language?: string;

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
	languageFirst?: boolean;

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
 * A `[`, `[]` or `[ ]` typed to add a nested blank node, which is edited in its own card below
 * the statement text; the closing bracket may be missing while it is being typed. The blank nodes a
 * statement already has are never written in the statement text.
 */
export interface NestedNodeToken extends StatementTokenBase {
	kind: 'nestedNode';
}

/**
 * A token of a statement text.
 */
export type StatementToken =
	| WhitespaceToken
	| PunctuationToken
	| NameToken
	| IriToken
	| LanguageToken
	| LiteralToken
	| NestedNodeToken;

/**
 * One value of a statement text: a single term, or a list `( … )` whose items are kept together
 * so padding, canonical form and statement text treat the list as one value.
 */
export interface ValueGroup {
	/**
	 * The term, or the items of the list without its brackets.
	 */
	items: StatementToken[];

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
