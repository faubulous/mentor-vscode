import { EditProblem } from '@src/services/editing/edit-problem';
import { getReadOnlyMessage } from './read-only-message';

/**
 * Put into words why the host did not apply an edit.
 * @param problem What went wrong.
 * @returns The message shown to the user.
 */
export function getEditProblemMessage(problem: EditProblem): string {
	switch (problem.kind) {
		case 'staleVersion':
			return 'The document changed before the edit was applied. Try again.';
		case 'syntaxErrors':
			return getReadOnlyMessage('syntaxErrors');
		case 'readOnly':
			return 'This document cannot be edited in the form editor.';
		case 'valueMoved':
			return 'The value is no longer at the place it was shown at.';
		case 'resourceGone':
			return 'The resource is no longer described in the document.';
		case 'predicateGone':
			return 'The resource does not carry this predicate any more.';
		case 'predicateTaken':
			return 'The resource already carries this predicate.';
		case 'lastStatements':
			return 'These are the last statements about the resource. Delete the resource to remove it.';
		case 'duplicateValue':
			return 'A value is listed twice.';
		case 'separateStatements':
			return 'Values written in separate statements keep their order.';
		case 'commentsBetweenValues':
			return 'Values with comments between them cannot change their order.';
		case 'statementNotEnded':
			return 'The statement is not ended by a period.';
		case 'listsNotSupported':
			return 'Lists cannot be written in the syntax of this document.';
		case 'emptyIri':
			return 'An IRI must not be empty.';
		case 'invalidIri':
			return `'${problem.iri}' is not a valid IRI.`;
		case 'invalidLanguageTag':
			return `'${problem.tag}' is not a valid language tag.`;
		case 'invalidSubject':
			return 'Only an IRI or a blank node can be the subject of a statement.';
		case 'invalidObject':
			return 'Only an IRI, a blank node or a literal can be the object of a statement.';
		case 'anonymousBlankNode':
			return 'An anonymous blank node cannot be referred to by name.';
		case 'overlappingEdits':
			return 'The changes overlap in the document. Make them one at a time.';
		case 'unsupportedOperation':
			return `The form editor cannot carry out '${problem.op}'.`;
		case 'verificationFailed':
			return 'The edit would have changed the document in a way the form did not intend, so it was not applied.';
		case 'notApplied':
			return 'The edit could not be applied to the document.';
	}
}
