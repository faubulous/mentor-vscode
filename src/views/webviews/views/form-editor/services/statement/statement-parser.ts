import { getIriFromText, splitPrefixedName } from '@src/utilities/prefixed-name';
import { StatementLexer } from './statement-lexer';
import { StatementToken, LiteralToken } from './statement-token';
import { StatementTextProblem, ParsedStatementText, ParsedValue } from './parsed-statement-text';
import { RDF_TYPE, XSD_NAMESPACE } from './well-known-iris';

const ESCAPES: Record<string, string> = { '"': '"', '\\': '\\', n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', "'": "'" };

/**
 * Reads a canonical statement text into its predicate and values. The `[` markers typed to add nested
 * blank nodes are numbered in the order read, lists included, so each can be added in place.
 */
export class StatementParser {
	private readonly _lexer = new StatementLexer();

	/**
	 * Create a parser for a document.
	 * @param _namespaces Prefix to namespace IRI.
	 */
	constructor(private readonly _namespaces: Record<string, string>) { }

	/**
	 * Unescape the text of a quoted literal.
	 * @param value The text between the quotes.
	 * @returns The value.
	 */
	static unescapeLiteral(value: string): string {
		return value.replace(/\\(u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|.)/g, (match, escaped: string) => {
			if (escaped.length > 1) {
				return String.fromCodePoint(parseInt(escaped.slice(1), 16));
			}

			return ESCAPES[escaped] ?? match;
		});
	}

	/**
	 * Read a statement text.
	 * @param text The statement text.
	 * @returns The statement, or the first problem that stops it from being one.
	 */
	parse(text: string): ParsedStatementText | StatementTextProblem {
		const tokens = this._lexer.tokenize(text);
		const items = this._lexer.items(tokens);

		if (items.length === 0) {
			return { message: 'A statement starts with its predicate', start: 0, end: text.length };
		}

		const predicate = this._parsePredicate(items[0]);

		if (typeof predicate !== 'string') {
			return predicate;
		}

		const values = this._parseValues(tokens.filter(token => token.kind !== 'whitespace' && token !== items[0]));

		return Array.isArray(values) ? { predicate, values } : values;
	}

	/**
	 * Read the predicate: `a`, an `<iri>` or a prefixed name with a declared prefix.
	 * @param token The first item of the statement text.
	 * @returns The IRI, or the problem.
	 */
	private _parsePredicate(token: StatementToken): string | StatementTextProblem {
		if (token.kind === 'name' && token.text === 'a') {
			return RDF_TYPE;
		}

		if (token.kind === 'iri' || token.kind === 'name') {
			const iri = this._parseIri(token);

			return typeof iri === 'string' ? iri : { ...iri, message: this._predicateMessage(token) };
		}

		return { message: 'A statement starts with its predicate', start: token.start, end: token.start + token.text.length };
	}

	/**
	 * Explain why a token is not a predicate.
	 * @param token The token.
	 * @returns The message.
	 */
	private _predicateMessage(token: StatementToken): string {
		const parts = splitPrefixedName(token.text);

		if (parts && this._namespaces[parts.prefix] === undefined) {
			return `Unknown prefix "${parts.prefix}:"`;
		}

		return token.kind === 'iri' ? 'Unclosed IRI' : `"${token.text}" is not a predicate`;
	}

	/**
	 * Read the values after the predicate, grouping the items between `(` and `)` into lists.
	 * @param tokens The tokens after the predicate, without whitespace.
	 * @returns The values, or the problem.
	 */
	private _parseValues(tokens: StatementToken[]): ParsedValue[] | StatementTextProblem {
		const stack: { items: ParsedValue[]; start: number }[] = [{ items: [], start: 0 }];
		let nestedNodeCount = 0;

		for (const token of tokens) {
			if (token.kind === 'punctuation' && token.text === '(') {
				stack.push({ items: [], start: token.start });
			} else if (token.kind === 'punctuation' && token.text === ')') {
				if (stack.length === 1) {
					return { message: 'Unmatched ")"', start: token.start, end: token.start + 1 };
				}

				const list = stack.pop()!;

				stack[stack.length - 1].items.push({ kind: 'list', items: list.items });
			} else if (token.kind !== 'punctuation') {
				const value = this._parseValue(token, nestedNodeCount);

				if (!('kind' in value)) {
					return value;
				}

				nestedNodeCount += value.kind === 'nestedNode' ? 1 : 0;
				stack[stack.length - 1].items.push(value);
			}
		}

		if (stack.length > 1) {
			const open = stack[stack.length - 1];

			return { message: 'Unmatched "("', start: open.start, end: open.start + 1 };
		}

		return stack[0].items;
	}

	/**
	 * Read one value token.
	 * @param token The token.
	 * @param nestedNodeIndex The number of nested-node markers read before it.
	 * @returns The value, or the problem.
	 */
	private _parseValue(token: StatementToken, nestedNodeIndex: number): ParsedValue | StatementTextProblem {
		const end = token.start + token.text.length;

		switch (token.kind) {
			case 'nestedNode':
				return { kind: 'nestedNode', index: nestedNodeIndex };
			case 'languageTag':
				return { message: 'A language tag needs a literal before it', start: token.start, end };
			case 'literal':
				return this._parseLiteral(token);
			case 'name':
				return this._parseName(token);
			case 'iri': {
				const iri = this._parseIri(token);

				return typeof iri === 'string' ? { kind: 'term', term: { kind: 'iri', iri } } : iri;
			}
			default:
				return { message: 'Not a value', start: token.start, end };
		}
	}

	/**
	 * Read a quoted literal with its language tag or datatype.
	 * @param token The literal token.
	 * @returns The value, or the problem.
	 */
	private _parseLiteral(token: LiteralToken): ParsedValue | StatementTextProblem {
		const end = token.start + token.text.length;

		if (!token.closed) {
			return { message: 'Unclosed quote', start: token.quoteStart, end };
		}

		const value = StatementParser.unescapeLiteral(token.value);

		if (token.language) {
			return { kind: 'term', term: { kind: 'literal', value, language: token.language } };
		}

		if (token.datatype === undefined) {
			return { kind: 'term', term: { kind: 'literal', value } };
		}

		const datatype = getIriFromText(this._namespaces, token.datatype);

		if (datatype === undefined) {
			return { message: `"${token.datatype}" is not a datatype`, start: token.start, end };
		}

		return { kind: 'term', term: { kind: 'literal', value, datatype } };
	}

	/**
	 * Read a bare word: a number or boolean, or a prefixed name.
	 * @param token The name token.
	 * @returns The value, or the problem.
	 */
	private _parseName(token: StatementToken): ParsedValue | StatementTextProblem {
		const bare = StatementLexer.bareDatatypeOf(token.text);

		if (bare) {
			return { kind: 'term', term: { kind: 'literal', value: token.text, datatype: XSD_NAMESPACE + bare.slice('xsd:'.length) } };
		}

		const iri = this._parseIri(token);

		return typeof iri === 'string' ? { kind: 'term', term: { kind: 'iri', iri } } : iri;
	}

	/**
	 * Read an `<iri>` or a prefixed name with a declared prefix.
	 * @param token The token.
	 * @returns The IRI, or the problem.
	 */
	private _parseIri(token: StatementToken): string | StatementTextProblem {
		const end = token.start + token.text.length;

		if (token.kind === 'iri') {
			return token.text.endsWith('>') && token.text.length > 1 ? token.text.slice(1, -1) : { message: 'Unclosed IRI', start: token.start, end };
		}

		const iri = getIriFromText(this._namespaces, token.text);

		if (iri !== undefined) {
			return iri;
		}

		const parts = splitPrefixedName(token.text);
		const message = parts ? `Unknown prefix "${parts.prefix}:"` : `"${token.text}" is not a known term`;

		return { message, start: token.start, end };
	}
}
