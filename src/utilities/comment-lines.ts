import type { IToken } from '@faubulous/mentor-rdf-parsers';

/**
 * The line of a comment as it is written, without the `#` that starts it, which is what a comment
 * field edits: `## Heading` is `# Heading`, `# about` is ` about`.
 * @param token The comment token.
 * @returns The line.
 */
export function getCommentLine(token: IToken): string {
	return token.image.slice(1).trimEnd();
}

/**
 * The text of a line of a comment as the form shows it: without the `#` signs and the one space or
 * tab that start it.
 * @param line The line, without the `#` that starts the comment.
 * @returns The text.
 */
export function getCommentLineText(line: string): string {
	return `#${line}`.replace(/^#+[ \t]?/, '');
}

/**
 * Write a line of a comment: `#` and the line, with a space before a line that starts with text,
 * so a line typed as text reads `# text`, while one that starts with a space or `#` is kept as
 * typed.
 * @param line The line, without the `#` that starts the comment.
 * @returns The comment as it is written.
 */
export function getCommentImage(line: string): string {
	return line === '' || /^[\s#]/.test(line) ? `#${line}` : `# ${line}`;
}
