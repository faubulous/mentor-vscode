import { EditRejectionError } from './edit-rejection';
import { ResourceId, getIriResourceId } from './resource-id';
import { StatementModel, SubjectBlock } from './statement-model';
import { TermRef } from './term-ref';

/**
 * Finds the blocks and values of the statement model that an operation refers to.
 */
export class StatementLocator {
	/**
	 * Create a locator for a statement model.
	 * @param _model The statement model.
	 */
	constructor(private readonly _model: StatementModel) { }

	/**
	 * Get the identifier the statement model keys a subject by.
	 * @param subject The subject in wire form.
	 * @returns The resource identifier.
	 * @throws {EditRejectionError} If the subject is a literal.
	 */
	static subjectId(subject: TermRef): ResourceId {
		if (subject.kind === 'literal') {
			throw new EditRejectionError('invalidTerm', 'A literal cannot be the subject of a statement.');
		}

		return subject.kind === 'bnode' ? `b:${subject.id}` : getIriResourceId(subject.iri);
	}

	/**
	 * Find the blocks describing a subject, in document order.
	 * @param subject The subject to look up.
	 * @returns The blocks of the subject.
	 * @throws {EditRejectionError} If the subject has no block in the document.
	 */
	blocksOf(subject: TermRef): SubjectBlock[] {
		const blocks = this._model.blocksBySubject.get(StatementLocator.subjectId(subject));

		if (!blocks || blocks.length === 0) {
			throw new EditRejectionError('notFound', 'The resource is no longer described in the document.');
		}

		return blocks;
	}

}
