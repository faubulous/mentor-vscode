import type { IToken } from '@faubulous/mentor-rdf-parsers';

/**
 * The Markdown text of a comment line, which a comment field edits: the line without the `#` that
 * starts it and the one space or tab after it, so `# about` is `about` and `## Heading` is
 * `# Heading`.
 * @param token The comment token.
 * @returns The text of the line.
 */
export function getCommentMarkdown(token: IToken): string {
	return token.image.slice(1).replace(/^[ \t]/, '').trimEnd();
}

/**
 * Write a line of Markdown text as a comment line: `# ` and the text, or `#` alone for an empty
 * line.
 * @param line The text of the line.
 * @returns The comment as it is written.
 */
export function getCommentImage(line: string): string {
	return line === '' ? '#' : `# ${line}`;
}
