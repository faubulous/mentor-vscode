import { CardLine } from './card-line';

/**
 * Where a row of the statement list comes from: a property of the resource, or a line the user
 * opened for a new statement.
 */
export type StatementRowSource = 'property' | 'draft';

/**
 * One row of the statement list: the line it shows and where it comes from.
 */
export interface StatementRow {
	/**
	 * The line the row shows.
	 */
	line: CardLine;

	/**
	 * Where the row comes from.
	 */
	source: StatementRowSource;

	/**
	 * The identifier of a draft line.
	 */
	draftId?: number;
}
