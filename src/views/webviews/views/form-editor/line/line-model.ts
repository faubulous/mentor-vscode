import { TermView } from '../form-editor-model';

/**
 * A property serialized as a line, with the views of the terms it names so the line can be
 * rendered with labels, and the blank nodes its placeholders stand for.
 */
export interface LineModel {
	/**
	 * The canonical text of the line.
	 */
	text: string;

	/**
	 * The views of the predicate and the IRI values, keyed by the text they are written as.
	 */
	terms: Record<string, TermView>;

	/**
	 * The blank-node values in the order of their `[…]` placeholders.
	 */
	holes: TermView[];
}
