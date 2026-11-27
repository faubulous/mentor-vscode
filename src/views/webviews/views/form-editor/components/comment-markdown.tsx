import { ReactNode } from 'react';

/**
 * Properties of the {@link CommentMarkdown} component.
 */
export interface CommentMarkdownProps {
	/**
	 * The Markdown text of the comment, its lines separated by line breaks.
	 */
	text: string;
}

/**
 * A block of a comment: a paragraph of joined lines, a heading or a list.
 */
type CommentMarkdownBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'heading'; text: string }
	| { type: 'list'; items: string[] };

/**
 * The text that starts a heading: one to three `#` signs and a space.
 */
const HEADING_PATTERN = /^#{1,3}[ \t]+(.*)$/;

/**
 * The text that starts an item of a list: `-` or `*` and a space.
 */
const LIST_ITEM_PATTERN = /^[ \t]*[-*][ \t]+(.*)$/;

/**
 * The inline spans of a line: code, then bold, then italic text.
 */
const INLINE_PATTERN = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

/**
 * A comment rendered from the subset of Markdown comments are written in: headings of up to three
 * levels, lists started with `-` or `*`, and in the text bold, italic and code spans. Blank lines
 * separate paragraphs; lines written one after the other join into one.
 * @param props The text of the comment.
 * @returns The rendered comment.
 */
export function CommentMarkdown({ text }: CommentMarkdownProps): React.JSX.Element {
	return (
		<>
			{getCommentMarkdownBlocks(text).map((block, index) => _renderBlock(block, index))}
		</>
	);
}

/**
 * Split the Markdown text of a comment into its blocks.
 * @param text The text.
 * @returns The blocks, in order.
 */
export function getCommentMarkdownBlocks(text: string): CommentMarkdownBlock[] {
	const blocks: CommentMarkdownBlock[] = [];
	let open: CommentMarkdownBlock | undefined;

	for (const line of text.split('\n')) {
		const heading = HEADING_PATTERN.exec(line);
		const item = LIST_ITEM_PATTERN.exec(line);

		if (line.trim() === '') {
			open = undefined;
		} else if (heading) {
			blocks.push({ type: 'heading', text: heading[1].trim() });
			open = undefined;
		} else if (item) {
			if (open?.type !== 'list') {
				open = { type: 'list', items: [] };
				blocks.push(open);
			}

			open.items.push(item[1].trim());
		} else if (open?.type === 'paragraph') {
			open.text += ` ${line.trim()}`;
		} else {
			open = { type: 'paragraph', text: line.trim() };
			blocks.push(open);
		}
	}

	return blocks;
}

/**
 * Render a block of a comment.
 * @param block The block.
 * @param key The key of the block among the others.
 * @returns The element.
 */
function _renderBlock(block: CommentMarkdownBlock, key: number): React.JSX.Element {
	switch (block.type) {
		case 'heading':
			return <div key={key} className="comment-heading">{_renderInline(block.text)}</div>;
		case 'list':
			return (
				<ul key={key} className="comment-list">
					{block.items.map((item, index) => <li key={index}>{_renderInline(item)}</li>)}
				</ul>
			);
		default:
			return <div key={key} className="comment-paragraph">{_renderInline(block.text)}</div>;
	}
}

/**
 * Render the text of a line with its code, bold and italic spans.
 * @param text The text.
 * @returns The nodes.
 */
function _renderInline(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let last = 0;

	for (const match of text.matchAll(INLINE_PATTERN)) {
		const start = match.index ?? 0;

		if (start > last) {
			nodes.push(text.slice(last, start));
		}

		const [, code, bold, italic] = match;

		if (code !== undefined) {
			nodes.push(<code key={start}>{code}</code>);
		} else if (bold !== undefined) {
			nodes.push(<strong key={start}>{bold}</strong>);
		} else {
			nodes.push(<em key={start}>{italic}</em>);
		}

		last = start + match[0].length;
	}

	if (last < text.length) {
		nodes.push(text.slice(last));
	}

	return nodes;
}
