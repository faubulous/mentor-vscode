import { EditRejectionError } from './edit-rejection';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { StatementModel, SubjectBlock } from './statement-model';

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
	 * Get the key the statement model keys a subject by.
	 * @param subject The subject, as an edit names it.
	 * @returns The key.
	 * @throws {EditRejectionError} If the subject is neither an IRI nor a blank node.
	 */
	static subjectKey(subject: NamedNode | BlankNode): string {
		if (subject.termType !== 'NamedNode' && subject.termType !== 'BlankNode') {
			throw new EditRejectionError('invalidTerm', 'Only an IRI or a blank node can be the subject of a statement.');
		}

		return termToString(subject);
	}

	/**
	 * Find the blocks describing a subject, in document order.
	 * @param subject The subject to look up.
	 * @returns The blocks of the subject.
	 * @throws {EditRejectionError} If the subject has no block in the document.
	 */
	blocksOf(subject: NamedNode | BlankNode): SubjectBlock[] {
		const blocks = this._model.blocksBySubject.get(StatementLocator.subjectKey(subject));

		if (!blocks || blocks.length === 0) {
			throw new EditRejectionError('notFound', 'The resource is no longer described in the document.');
		}

		return blocks;
	}

}
