import { describe, expect, it } from 'vitest';
import { TextMateToken, TextMateTokenizer } from '@src/utilities/mocks/textmate-tokenizer';

/**
 * Tests for the highlighting of string literals in the TextMate grammars, in particular of long
 * strings in triple quotes (faubulous/mentor-vscode#224).
 */

const SCOPES = ['source.turtle', 'source.trig', 'source.sparql'];

/**
 * Indicates whether a token has a scope that starts with the given name.
 * @param token The token to check.
 * @param scope The scope name, e.g. `string.quoted.triple`.
 */
function hasScope(token: TextMateToken, scope: string): boolean {
	return token.scopes.some(s => s.split(' ').some(part => part.startsWith(scope)));
}

/**
 * The tokens of a line from the given text to the end of the line.
 * @param tokens The tokens of the line.
 * @param text The text the first token holds.
 * @returns The tokens from that one on.
 */
function tokensFrom(tokens: TextMateToken[], text: string): TextMateToken[] {
	const index = tokens.findIndex(token => token.text.includes(text));

	expect(index, `expected a token holding '${text}' in ${JSON.stringify(tokens.map(token => token.text))}`).toBeGreaterThanOrEqual(0);

	return tokens.slice(index);
}

/**
 * Asserts that every token holding part of the literal is a string, and nothing else: no keyword,
 * prefix or punctuation inside it.
 * @param tokens The tokens of the literal.
 */
function expectString(tokens: TextMateToken[]): void {
	for (const token of tokens) {
		expect(hasScope(token, 'string.quoted.triple'), `'${token.text}' must be part of the string, scopes: ${token.scopes.join(' ')}`).toBe(true);

		for (const scope of ['keyword', 'storage.modifier.prefix', 'punctuation', 'string.quoted.single', 'string.quoted.double']) {
			expect(hasScope(token, scope), `'${token.text}' must not have the scope ${scope}`).toBe(false);
		}
	}
}

/**
 * The text of the tokens joined, so a line can be split into the literal and what follows it.
 * @param tokens The tokens.
 * @returns Their text.
 */
function textOf(tokens: TextMateToken[]): string {
	return tokens.map(token => token.text).join('');
}

describe.each(SCOPES)('string literals in the %s grammar', scopeName => {
	it.each([
		["'''Test abc' bla'''", "'"],
		['"""Test abc" bla"""', '"'],
	])('keeps a triple-quoted literal with a quote in it whole: %s', async (literal, quote) => {
		const line = `ex:a ex:p ${literal} .`;
		const tokens = tokensFrom(await TextMateTokenizer.tokenizeLine(scopeName, line), quote.repeat(3));
		const closing = tokens.findIndex((token, index) => index > 0 && token.text.includes(quote.repeat(3)));

		expect(closing).toBeGreaterThan(0);
		expectString(tokens.slice(0, closing + 1));
		expect(textOf(tokens.slice(0, closing + 1))).toBe(literal);
		expect(tokens.slice(closing + 1).some(token => hasScope(token, 'string'))).toBe(false);
	});

	it('highlights nothing inside a triple-quoted literal that reads like syntax', async () => {
		const tokens = tokensFrom(await TextMateTokenizer.tokenizeLine(scopeName, "ex:a ex:p '''Test a (x) ex:b''' ."), "'''");
		const closing = tokens.findIndex((token, index) => index > 0 && token.text.includes("'''"));

		expectString(tokens.slice(0, closing + 1));
	});

	it('keeps a triple-quoted literal whole across lines, with a quote on a line of its own', async () => {
		const lines = ["ex:a ex:p '''First line", "it's the second", "third''' ;", '  ex:q ex:b .'];
		const [first, second, third, fourth] = await TextMateTokenizer.tokenizeLines(scopeName, lines);

		expectString(tokensFrom(first, "'''"));
		expectString(second);
		expectString(tokensFrom(third, 'third').slice(0, 1));
		expect(third.slice(-1)[0].text).toContain(';');
		expect(third.slice(-1)[0].scopes.some(scope => scope.startsWith('string'))).toBe(false);
		expect(fourth.some(token => hasScope(token, 'string'))).toBe(false);
	});

	it('keeps an escaped quote inside a triple-quoted literal', async () => {
		const tokens = tokensFrom(await TextMateTokenizer.tokenizeLine(scopeName, "ex:a ex:p '''a \\''' b''' ."), "'''");
		const closing = tokens.findIndex((token, index) => index > 0 && token.text === "'''");

		expectString(tokens.slice(0, closing + 1));
		expect(textOf(tokens.slice(0, closing + 1))).toBe("'''a \\''' b'''");
		expect(tokens.some(token => hasScope(token, 'constant.character.escape'))).toBe(true);
	});
});
