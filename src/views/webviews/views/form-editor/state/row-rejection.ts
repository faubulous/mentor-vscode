import { EditProblem } from '@src/services/editing/edit-problem';

/**
 * Why a row was not written: the host refused its edit, or the statement typed into a new row
 * names a predicate the card shows but cannot edit, whose values a new statement would replace.
 * The components put it into words.
 */
export type RowRejection =
	| { kind: 'refused'; problem: EditProblem }
	| { kind: 'predicateNotEditable'; predicate: string };
