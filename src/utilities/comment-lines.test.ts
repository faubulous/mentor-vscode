import { describe, it, expect } from 'vitest';
import type { IToken } from '@faubulous/mentor-rdf-parsers';
import { getCommentImage, getCommentLine, getCommentLineText } from '@src/utilities/comment-lines';

/**
 * A comment token with the given image.
 * @param image The image of the token.
 * @returns The token, with only the image set.
 */
function commentToken(image: string): IToken {
	return { image } as IToken;
}

describe('getCommentLine', () => {
	it('drops the first # and trailing whitespace', () => {
		expect(getCommentLine(commentToken('# about'))).toBe(' about');
		expect(getCommentLine(commentToken('## Heading  '))).toBe('# Heading');
		expect(getCommentLine(commentToken('#'))).toBe('');
	});
});

describe('getCommentLineText', () => {
	it('drops the # signs and the one space or tab after them', () => {
		expect(getCommentLineText(' about')).toBe('about');
		expect(getCommentLineText('# Heading')).toBe('Heading');
		expect(getCommentLineText('\tindented')).toBe('indented');
		expect(getCommentLineText('  two spaces')).toBe(' two spaces');
	});

	it('keeps a line without a space after the #', () => {
		expect(getCommentLineText('about')).toBe('about');
		expect(getCommentLineText('')).toBe('');
	});
});

describe('getCommentImage', () => {
	it('puts a space before a line that starts with text', () => {
		expect(getCommentImage('about')).toBe('# about');
	});

	it('keeps a line that starts with a space or # as typed', () => {
		expect(getCommentImage(' about')).toBe('# about');
		expect(getCommentImage('# Heading')).toBe('## Heading');
		expect(getCommentImage('')).toBe('#');
	});
});
