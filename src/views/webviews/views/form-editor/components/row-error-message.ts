import { RowRejection } from '../state/row-rejection';
import { StatementRowState } from '../state/statement-row-state';
import { getTermProblemMessage } from './term-problem-message';

/**
 * Put into words why a row was not written, or why what was typed last reads as no term.
 * @param state The state of the row.
 * @returns The message, or `undefined` when the row has nothing to tell.
 */
export function getRowErrorMessage(state: StatementRowState): string | undefined {
	if (state.rejection) {
		return _rejectionMessage(state.rejection);
	}

	return state.problem ? getTermProblemMessage(state.problem) : undefined;
}

/**
 * Put into words why a row was not written.
 * @param rejection The reason.
 * @returns The message.
 */
function _rejectionMessage(rejection: RowRejection): string {
	switch (rejection.kind) {
		case 'refused':
			return rejection.message;
		case 'predicateNotEditable':
			return 'The resource already states this predicate in a way the form cannot edit. Add the value in the text editor.';
	}
}
