import { StatementRowEditor } from './statement-row-editor';

/**
 * The rows of a card, as a row for a new statement sees them: where its statement goes, and whom
 * to tell when it is handed over.
 */
export interface StatementRowOwner {
	/**
	 * Find the row of a predicate the card shows.
	 * @param predicate The IRI of the predicate.
	 * @returns The row, `'notEditable'` for a predicate whose row only reads, or `undefined` when
	 * the card does not show the predicate.
	 */
	rowOf(predicate: string): StatementRowEditor | 'notEditable' | undefined;

	/**
	 * Note that a new statement was handed over from a row, which then shows it until the host
	 * does, so another row for a new statement is needed.
	 * @param row The row.
	 */
	submitted(row: StatementRowEditor): void;

	/**
	 * Note that the values of a new statement went into the row of its predicate, so the row they
	 * were typed into goes.
	 * @param row The row.
	 */
	merged(row: StatementRowEditor): void;
}
