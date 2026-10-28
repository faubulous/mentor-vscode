import { Fragment } from 'react';
import { highlightSegments } from '@src/utilities/text-highlight';

/**
 * Properties of the {@link HighlightedText} component.
 */
export interface HighlightedTextProps {
	/**
	 * The text to show.
	 */
	text: string;

	/**
	 * The text typed into the filter field, whose matches are marked.
	 */
	query?: string;
}

/**
 * A text with the matches of the filter marked, as a find widget marks them.
 * @param props The text and the filter.
 * @returns The marked text.
 */
export function HighlightedText({ text, query }: HighlightedTextProps): React.JSX.Element {
	return (
		<>
			{highlightSegments(text, query ?? '').map((segment, index) => segment.match
				? <mark key={index} className="filter-match">{segment.text}</mark>
				: <Fragment key={index}>{segment.text}</Fragment>)}
		</>
	);
}
