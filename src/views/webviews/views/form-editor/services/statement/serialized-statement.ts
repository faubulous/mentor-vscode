import { TermView } from '../../form-editor-model';

/**
 * A property serialized as statement text, with the views of the terms it names so its fields
 * can be shown with labels, and the blank-node values it leaves out of the text.
 */
export interface SerializedStatement {
	/**
	 * The canonical text of the statement text.
	 */
	text: string;

	/**
	 * The views of the predicate and the IRI values, keyed by the text they are written as.
	 */
	terms: Record<string, TermView>;

	/**
	 * The blank-node values, in the order written in the document. They are not written on the
	 * text but shown as nested cards below it.
	 */
	nestedNodes: TermView[];
}
