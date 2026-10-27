import { iriOfTermText, splitCurie } from '@src/utilities/curie';
import { LineLexer } from './line-lexer';
import { LineToken, LiteralToken } from './line-token';
import { LineProblem, ParsedLine, ParsedValue } from './parsed-line';
import { RDF_TYPE, XSD_NAMESPACE } from './well-known-iris';

const ESCAPES: Record<string, string> = { '"': '"', '\\': '\\', n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', "'": "'" };

/**
 * Reads a canonical line into its predicate and values. Blank-node placeholders are numbered in
 * order, lists keep their items.
 */
export class LineParser {
	private readonly _lexer = new LineLexer();

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
	 * Read a line.
	 * @param text The text of the line.
	 * @returns The statement, or the first problem that stops it from being one.
	 */
	parse(text: string): ParsedLine | LineProblem {
		const tokens = this._lexer.tokenize(text);
		const items = this._lexer.items(tokens);

		if (items.length === 0) {
			return { message: 'A line starts with its predicate', start: 0, end: text.length };
		}

		const predicate = this._parsePredicate(items[0]);

		if (typeof predicate !== 'string') {
			return predicate;
		}

		const values = this._parseValues(tokens.filter(token => token.kind !== 'ws' && token !== items[0]));

		return Array.isArray(values) ? { predicate, values } : values;
	}

	/**
	 * Read the predicate: `a`, an `<iri>` or a prefixed name with a declared prefix.
	 * @param token The first item of the line.
	 * @returns The IRI, or the problem.
	 */
	private _parsePredicate(token: LineToken): string | LineProblem {
		if (token.kind === 'name' && token.text === 'a') {
			return RDF_TYPE;
		}

		if (token.kind === 'iri' || token.kind === 'name') {
			const iri = this._parseIri(token);

			return typeof iri === 'string' ? iri : { ...iri, message: this._predicateMessage(token) };
		}

		return { message: 'A line starts with its predicate', start: token.start, end: token.start + token.text.length };
	}

	/**
	 * Explain why a token is not a predicate.
	 * @param token The token.
	 * @returns The message.
	 */
	private _predicateMessage(token: LineToken): string {
		const parts = splitCurie(token.text);

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
	private _parseValues(tokens: LineToken[]): ParsedValue[] | LineProblem {
		const stack: { items: ParsedValue[]; start: number }[] = [{ items: [], start: 0 }];
		let holeCount = 0;

		for (const token of tokens) {
			if (token.kind === 'punct' && token.text === '(') {
				stack.push({ items: [], start: token.start });
			} else if (token.kind === 'punct' && token.text === ')') {
				if (stack.length === 1) {
					return { message: 'Unmatched ")"', start: token.start, end: token.start + 1 };
				}

				const list = stack.pop()!;

				stack[stack.length - 1].items.push({ kind: 'list', items: list.items });
			} else if (token.kind !== 'punct') {
				const value = this._parseValue(token, holeCount);

				if (!('kind' in value)) {
					return value;
				}

				holeCount += value.kind === 'hole' ? 1 : 0;
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
	 * @param holeIndex The number of placeholders read before it.
	 * @returns The value, or the problem.
	 */
	private _parseValue(token: LineToken, holeIndex: number): ParsedValue | LineProblem {
		const end = token.start + token.text.length;

		switch (token.kind) {
			case 'hole':
				return { kind: 'hole', index: holeIndex };
			case 'lang':
				return { message: 'A language tag needs a literal before it', start: token.start, end };
			case 'lit':
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
	private _parseLiteral(token: LiteralToken): ParsedValue | LineProblem {
		const end = token.start + token.text.length;

		if (!token.closed) {
			return { message: 'Unclosed quote', start: token.quoteStart, end };
		}

		const value = LineParser.unescapeLiteral(token.value);

		if (token.lang) {
			return { kind: 'term', term: { kind: 'literal', value, language: token.lang } };
		}

		if (token.datatype === undefined) {
			return { kind: 'term', term: { kind: 'literal', value } };
		}

		const datatype = iriOfTermText(token.datatype, this._namespaces);

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
	private _parseName(token: LineToken): ParsedValue | LineProblem {
		const bare = LineLexer.bareDatatypeOf(token.text);

		if (bare) {
			return { kind: 'term', term: { kind: 'literal', value: token.text, datatype: XSD_NAMESPACE + bare.slice(4) } };
		}

		const iri = this._parseIri(token);

		return typeof iri === 'string' ? { kind: 'term', term: { kind: 'iri', iri } } : iri;
	}

	/**
	 * Read an `<iri>` or a prefixed name with a declared prefix.
	 * @param token The token.
	 * @returns The IRI, or the problem.
	 */
	private _parseIri(token: LineToken): string | LineProblem {
		const end = token.start + token.text.length;

		if (token.kind === 'iri') {
			return token.text.endsWith('>') && token.text.length > 1 ? token.text.slice(1, -1) : { message: 'Unclosed IRI', start: token.start, end };
		}

		const iri = iriOfTermText(token.text, this._namespaces);

		if (iri !== undefined) {
			return iri;
		}

		const parts = splitCurie(token.text);
		const message = parts ? `Unknown prefix "${parts.prefix}:"` : `"${token.text}" is not a known term`;

		return { message, start: token.start, end };
	}
}
