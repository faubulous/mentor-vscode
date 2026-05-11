import * as React from 'react';

interface MarkdownTextProps {
	text: string;
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Renders a plain-text string that may contain Markdown inline links `[text](url)`.
 * All links open in a new tab. No other Markdown is supported.
 */
export function MarkdownText({ text }: MarkdownTextProps) {
	const parts: React.ReactNode[] = [];
	
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	LINK_PATTERN.lastIndex = 0;

	while ((match = LINK_PATTERN.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}

		parts.push(
			<a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">
				{match[1]}
			</a>
		);

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return <>{parts}</>;
}
