import { IToken } from 'millan';
import { getNextToken, getPreviousToken } from './tokens';

describe('Token Utilities', () => {
	const tokens: IToken[] = [
		{ startOffset: 0, startLine: 1, startColumn: 1, endLine: 1, endColumn: 5, image: 'x' },
		{ startOffset: 0, startLine: 2, startColumn: 1, endLine: 2, endColumn: 5, image: 'y' },
		{ startOffset: 0, startLine: 3, startColumn: 1, endLine: 3, endColumn: 5, image: 'z' },
	];

	test('getNextToken should return the next token', () => {
		const token = tokens[0];
		const nextToken = getNextToken(tokens, token);
		expect(nextToken).toEqual(tokens[1]);
	});

	test('getNextToken should return undefined if there is no next token', () => {
		const token = tokens[tokens.length - 1];
		const nextToken = getNextToken(tokens, token);
		expect(nextToken).toBeUndefined();
	});

	test('getPreviousToken should return the previous token', () => {
		const token = tokens[1];
		const previousToken = getPreviousToken(tokens, token);
		expect(previousToken).toEqual(tokens[0]);
	});

	test('getPreviousToken should return undefined if there is no previous token', () => {
		const token = tokens[0];
		const previousToken = getPreviousToken(tokens, token);
		expect(previousToken).toBeUndefined();
	});
});