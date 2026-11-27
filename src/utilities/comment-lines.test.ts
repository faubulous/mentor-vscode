import { describe, it, expect } from 'vitest';
import type { IToken } from '@faubulous/mentor-rdf-parsers';
import { getCommentImage, getCommentMarkdown } from '@src/utilities/comment-lines';

/**
 * A comment token with the given image.
 * @param image The image of the token.
 * @returns The token, with only the image set.
 */
function commentToken(image: string): IToken {
	return { image } as IToken;
}

describe('getCommentMarkdown', () => {
	it('drops the first #, the one space or tab after it and trailing whitespace', () => {
		expect(getCommentMarkdown(commentToken('# about'))).toBe('about');
		expect(getCommentMarkdown(commentToken('## Heading  '))).toBe('# Heading');
		expect(getCommentMarkdown(commentToken('#\tindented'))).toBe('indented');
		expect(getCommentMarkdown(commentToken('#   - item'))).toBe('  - item');
	});

	it('keeps a line without a space after the #', () => {
		expect(getCommentMarkdown(commentToken('#about'))).toBe('about');
		expect(getCommentMarkdown(commentToken('#'))).toBe('');
	});
});

describe('getCommentImage', () => {
	it('writes # and a space before the text of a line', () => {
		expect(getCommentImage('about')).toBe('# about');
		expect(getCommentImage('# Heading')).toBe('# # Heading');
		expect(getCommentImage('  - item')).toBe('#   - item');
	});

	it('writes an empty line as # alone', () => {
		expect(getCommentImage('')).toBe('#');
	});
});
