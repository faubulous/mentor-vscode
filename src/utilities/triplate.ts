/**
 * Captures the opening fence, body and closing fence of a triplate frontmatter block.
 */
const FRONTMATTER_RE = /^(---[ \t]*\r?\n)([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

/**
 * Returns the offset at which the document body begins, i.e. the character after the
 * closing `---` line of a triplate frontmatter block, or `0` when there is no frontmatter.
 * Used to anchor edits (e.g. inserting a prefix declaration) below a triplate header.
 */
export function getContentStartOffset(text: string): number {
	const m = text.match(FRONTMATTER_RE);

	return m ? m[0].length : 0;
}
