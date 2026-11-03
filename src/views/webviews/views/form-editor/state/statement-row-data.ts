import { BlankNode, NamedNode } from '@rdfjs/types';
import { PropertyView } from '../form-editor-model';
import { TypedTermReader } from '../services/statement/typed-term-reader';

/**
 * What a card hands a statement row each time it renders: the property the row shows and the
 * means to read what is typed.
 */
export interface StatementRowData {
	/**
	 * The resource the statement is about.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The resource of the card of the list that shows the row: the subject itself, or the card a
	 * nested blank node is shown in.
	 */
	card: NamedNode | BlankNode;

	/**
	 * The property, or none for a row a new statement is typed into.
	 */
	property?: PropertyView;

	/**
	 * How the predicate of the property is written in its field.
	 */
	predicateText: string;

	/**
	 * The predicate of a row for a new statement whose predicate is given rather than typed, as the
	 * row that stands in for the type of a blank node.
	 */
	predicate?: string;

	/**
	 * The document version the property belongs to.
	 */
	version: number;

	/**
	 * Whether the property belongs to an earlier version while the current one loads; the row
	 * writes nothing until it is current.
	 */
	stale: boolean;

	/**
	 * Reads what is typed, with the prefixes of the document.
	 */
	reader: TypedTermReader;
}
