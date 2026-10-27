import { LineToken, LiteralToken, ValueGroup } from './line-token';

const PUNCTUATION = new Set([',', ';', '(', ')']);
const TAG_CHARACTER = /[A-Za-z0-9-]/;

/**
 * The datatypes a bare number or boolean on a line stands for.
 */
export type BareDatatype = 'xsd:boolean' | 'xsd:integer' | 'xsd:decimal' | 'xsd:double';

/**
 * Splits the text of a statement line into tokens. Every character of the line belongs to
 * exactly one token, so the tokens can be laid over the text for rendering.
 */
export class LineLexer {
	/**
	 * Indicate whether a character separates the terms of a line: whitespace, `,`, `;` or a list
	 * bracket.
	 * @param character The character to test.
	 * @returns `true` for a separator.
	 */
	static isSeparator(character: string | undefined): boolean {
		return LineLexer.isWhitespace(character) || character === ',' || character === ';' || character === '(' || character === ')';
	}

	/**
	 * Indicate whether a character is a space or a tab.
	 * @param character The character to test.
	 * @returns `true` for whitespace.
	 */
	static isWhitespace(character: string | undefined): boolean {
		return character === ' ' || character === '\t';
	}

	/**
	 * Indicate whether a line is a comment, which starts with `#`.
	 * @param text The text of the line.
	 * @returns `true` for a comment line.
	 */
	static isComment(text: string | undefined): boolean {
		return /^\s*#/.test(text ?? '');
	}

	/**
	 * Get the text of a comment line without its `#` and the space after it.
	 * @param text The text of the line.
	 * @returns The comment text.
	 */
	static stripComment(text: string | undefined): string {
		return (text ?? '').trim().replace(/^#\s?/, '');
	}

	/**
	 * Get the datatype a bare word stands for, when it is a number or a boolean written without
	 * quotes.
	 * @param word The bare word.
	 * @returns The datatype, or `undefined` if the word is not a Turtle shorthand literal.
	 */
	static bareDatatypeOf(word: string): BareDatatype | undefined {
		if (word === 'true' || word === 'false') {
			return 'xsd:boolean';
		}

		if (/^[+-]?\d+$/.test(word)) {
			return 'xsd:integer';
		}

		if (/^[+-]?(\d+\.\d*|\.\d+)$/.test(word)) {
			return 'xsd:decimal';
		}

		if (/^[+-]?(\d+\.?\d*|\.\d+)[eE][+-]?\d+$/.test(word)) {
			return 'xsd:double';
		}

		return undefined;
	}

	/**
	 * Split the text of a line into tokens.
	 * @param text The text of the line.
	 * @returns The tokens, covering the text.
	 */
	tokenize(text: string): LineToken[] {
		const tokens: LineToken[] = [];
		let index = 0;

		while (index < text.length) {
			const token = this._nextToken(text, index);

			tokens.push(token);
			index = token.start + token.text.length;
		}

		return tokens;
	}

	/**
	 * Get the tokens that carry meaning: everything except whitespace and punctuation.
	 * @param tokens The tokens of a line.
	 * @returns The items.
	 */
	items(tokens: readonly LineToken[]): LineToken[] {
		return tokens.filter(token => token.kind !== 'ws' && token.kind !== 'punct');
	}

	/**
	 * Find the item the caret is in or touches.
	 * @param text The text of the line.
	 * @param caret The caret offset.
	 * @returns The item, or `undefined` if the caret is in whitespace.
	 */
	tokenAt(text: string, caret: number): LineToken | undefined {
		return this.items(this.tokenize(text)).find(token => caret >= token.start && caret <= token.start + token.text.length);
	}

	/**
	 * Group the values that follow the predicate: every item is a group of its own, except the
	 * items between `(` and `)`, which form one list group. An unclosed list runs to the end of
	 * the line.
	 * @param tokens The tokens of a line.
	 * @returns The groups.
	 */
	valueGroups(tokens: readonly LineToken[]): ValueGroup[] {
		const groups: ValueGroup[] = [];
		let list: ValueGroup | undefined;
		let depth = 0;
		let seenPredicate = false;

		for (const token of tokens) {
			if (token.kind === 'ws') {
				continue;
			}

			if (token.kind === 'punct' && token.text === '(') {
				list = list ?? { items: [], list: true, start: token.start, end: token.start + 1 };
				depth++;
			} else if (token.kind === 'punct' && token.text === ')') {
				depth = Math.max(0, depth - 1);

				if (list && depth === 0) {
					list.end = token.start + 1;
					groups.push(list);
					list = undefined;
				}
			} else if (token.kind !== 'punct' && !seenPredicate) {
				seenPredicate = true;
			} else if (token.kind !== 'punct' && list) {
				list.items.push(token);
				list.end = token.start + token.text.length;
			} else if (token.kind !== 'punct') {
				groups.push({ items: [token], list: false, start: token.start, end: token.start + token.text.length });
			}
		}

		if (list) {
			groups.push(list);
		}

		return groups;
	}

	/**
	 * Read the token that starts at an index.
	 * @param text The text of the line.
	 * @param index The offset the token starts at.
	 * @returns The token.
	 */
	private _nextToken(text: string, index: number): LineToken {
		const character = text[index];

		if (LineLexer.isWhitespace(character)) {
			return { kind: 'ws', text: text.slice(index, _skipWhitespace(text, index)), start: index };
		}

		if (PUNCTUATION.has(character)) {
			return { kind: 'punct', text: character, start: index };
		}

		if (character === '@') {
			return this._tagToken(text, index);
		}

		if (character === '"') {
			return this._literalToken(text, index, index, undefined, '');
		}

		if (character === '<') {
			return _bracketedToken(text, index, '>', 'iri');
		}

		if (character === '[') {
			return _bracketedToken(text, index, ']', 'hole');
		}

		return _nameToken(text, index);
	}

	/**
	 * Read a language tag; when a quoted literal follows it, the tag belongs to that literal.
	 * @param text The text of the line.
	 * @param index The offset of the `@`.
	 * @returns The tag or the literal it precedes.
	 */
	private _tagToken(text: string, index: number): LineToken {
		let end = index + 1;

		while (end < text.length && TAG_CHARACTER.test(text[end])) {
			end++;
		}

		const quote = _skipWhitespace(text, end);

		if (text[quote] === '"') {
			return this._literalToken(text, index, quote, text.slice(index + 1, end), text.slice(end, quote));
		}

		return { kind: 'lang', text: text.slice(index, end), start: index };
	}

	/**
	 * Read a quoted literal with its language tag or datatype.
	 * @param text The text of the line.
	 * @param start Where the token starts, which is before the quote when a tag precedes it.
	 * @param quoteStart The offset of the opening quote.
	 * @param preLang A language tag written before the quote, without its `@`.
	 * @param gap The whitespace between that tag and the quote.
	 * @returns The literal token.
	 */
	private _literalToken(text: string, start: number, quoteStart: number, preLang: string | undefined, gap: string): LiteralToken {
		let index = quoteStart + 1;

		while (index < text.length && text[index] !== '"') {
			index += text[index] === '\\' ? 2 : 1;
		}

		const closed = index < text.length;
		const quoteEnd = closed ? index : -1;
		const valueEnd = closed ? index + 1 : text.length;
		const suffixEnd = closed ? _suffixEnd(text, valueEnd) : valueEnd;
		const suffix = text.slice(valueEnd, suffixEnd);
		const suffixLang = suffix.startsWith('@') ? suffix.slice(1) : undefined;
		const lang = preLang !== undefined ? preLang : suffixLang;

		return {
			kind: 'lit',
			text: text.slice(start, suffixEnd),
			start,
			value: text.slice(quoteStart + 1, closed ? quoteEnd : text.length),
			lang: lang === '' ? undefined : lang,
			datatype: suffix.startsWith('^^') ? suffix.slice(2) : undefined,
			closed,
			langPre: preLang !== undefined ? true : undefined,
			quoteStart,
			quoteEnd,
			gap,
			suffix
		};
	}
}

/**
 * Advance over spaces and tabs.
 * @param text The text of the line.
 * @param index The offset to start at.
 * @returns The offset of the first character that is not whitespace.
 */
function _skipWhitespace(text: string, index: number): number {
	let end = index;

	while (end < text.length && LineLexer.isWhitespace(text[end])) {
		end++;
	}

	return end;
}

/**
 * Find the end of the `@lang` or `^^datatype` suffix that follows a closing quote.
 * @param text The text of the line.
 * @param index The offset after the closing quote.
 * @returns The offset after the suffix.
 */
function _suffixEnd(text: string, index: number): number {
	let end = index;

	if (text[end] === '@') {
		end++;

		while (end < text.length && TAG_CHARACTER.test(text[end])) {
			end++;
		}

		return end;
	}

	if (text.slice(end, end + 2) !== '^^') {
		return end;
	}

	end += 2;

	if (text[end] === '<') {
		const close = text.indexOf('>', end);

		return close < 0 ? text.length : close + 1;
	}

	while (end < text.length && !LineLexer.isSeparator(text[end]) && text[end] !== '"') {
		end++;
	}

	return end;
}

/**
 * Read a token enclosed in brackets, up to the closing bracket or the end of the line.
 * @param text The text of the line.
 * @param index The offset of the opening bracket.
 * @param close The closing bracket.
 * @param kind The kind of token the brackets enclose.
 * @returns The token.
 */
function _bracketedToken(text: string, index: number, close: string, kind: 'iri' | 'hole'): LineToken {
	const closeIndex = text.indexOf(close, index);
	const end = closeIndex < 0 ? text.length : closeIndex + 1;

	return { kind, text: text.slice(index, end), start: index };
}

/**
 * Read a bare word up to the next separator, quote or bracket.
 * @param text The text of the line.
 * @param index The offset the word starts at.
 * @returns The token.
 */
function _nameToken(text: string, index: number): LineToken {
	let end = index;

	while (end < text.length && !LineLexer.isSeparator(text[end]) && text[end] !== '"' && text[end] !== '[') {
		end++;
	}

	return { kind: 'name', text: text.slice(index, end), start: index };
}
