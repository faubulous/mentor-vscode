import { EditRejectionReason } from '@src/services/editing/edit-operation';

/**
 * Why a row was not written: the host refused its edit, or the statement typed into a new row
 * names a predicate the card shows but cannot edit, whose values a new statement would replace.
 * The components put it into words.
 */
export type RowRejection =
	| { kind: 'refused'; reason: EditRejectionReason; message: string }
	| { kind: 'predicateNotEditable'; predicate: string };
