// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CommentMarkdown, getCommentMarkdownBlocks } from './comment-markdown';

/**
 * Render the Markdown text of a comment.
 * @param text The text.
 * @returns The element holding the rendered comment.
 */
function rendered(text: string): HTMLElement {
	return render(<div><CommentMarkdown text={text} /></div>).container.firstElementChild as HTMLElement;
}

describe('getCommentMarkdownBlocks', () => {
	it('joins lines written one after the other into a paragraph, and starts a new one after a blank line', () => {
		expect(getCommentMarkdownBlocks('one\ntwo\n\nthree')).toEqual([
			{ type: 'paragraph', text: 'one two' },
			{ type: 'paragraph', text: 'three' }
		]);
	});

	it('reads headings of up to three levels, and lists started with - or *', () => {
		expect(getCommentMarkdownBlocks('# One\n### Three\n#### Four\n- a\n* b\nafter')).toEqual([
			{ type: 'heading', text: 'One' },
			{ type: 'heading', text: 'Three' },
			{ type: 'paragraph', text: '#### Four' },
			{ type: 'list', items: ['a', 'b'] },
			{ type: 'paragraph', text: 'after' }
		]);
	});
});

describe('CommentMarkdown', () => {
	it('renders code, bold and italic spans in the text', () => {
		const element = rendered('a `sh:path` is **required**, *not* optional');

		expect(element.querySelector('code')?.textContent).toBe('sh:path');
		expect(element.querySelector('strong')?.textContent).toBe('required');
		expect(element.querySelector('em')?.textContent).toBe('not');
		expect(element.textContent).toBe('a sh:path is required, not optional');
	});

	it('renders headings, paragraphs and lists as blocks', () => {
		const element = rendered('# Title\nsome text\n\n- first\n- second');

		expect(element.querySelector('.comment-heading')?.textContent).toBe('Title');
		expect(element.querySelector('.comment-paragraph')?.textContent).toBe('some text');
		expect(Array.from(element.querySelectorAll('.comment-list > li')).map(item => item.textContent)).toEqual(['first', 'second']);
	});

	it('keeps a lone * as text', () => {
		expect(rendered('2 * 3 and a*').textContent).toBe('2 * 3 and a*');
	});
});
