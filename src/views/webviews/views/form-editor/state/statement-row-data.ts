import { PropertyView, TermRef } from '../form-editor-model';
import { TypedTermReader } from '../services/statement/typed-term-reader';

/**
 * What a card hands a statement row each time it renders: the property the row shows and the
 * means to read what is typed.
 */
export interface StatementRowData {
	/**
	 * The identifier of the resource the statement is about.
	 */
	resourceId: string;

	/**
	 * The resource the statement is about.
	 */
	subject: TermRef;

	/**
	 * The property, or none for a row a new statement is typed into.
	 */
	property?: PropertyView;

	/**
	 * How the predicate of the property is written in its field.
	 */
	predicateText: string;

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
