import { EditRejectionError } from './edit-rejection';
import { ResourceId, getIriResourceId } from './resource-id';
import { ObjectSpan, PredicateGroup, StatementModel, SubjectBlock } from './statement-model';
import { TermRef } from './term-ref';

/**
 * Names one value of a subject by the source offset the statement model places it at, which
 * tells it apart from a duplicate of the same value.
 */
export interface ValueLocation {
	/**
	 * The subject the value belongs to.
	 */
	subject: TermRef;

	/**
	 * The predicate the value is written under.
	 */
	predicate: string;

	/**
	 * The source offset of the value's span.
	 */
	anchor: number;
}

/**
 * A value located in the document, together with the group and block it is written in.
 */
export interface ResolvedValue {
	/**
	 * The block the value is written in.
	 */
	block: SubjectBlock;

	/**
	 * The predicate group the value is written under.
	 */
	group: PredicateGroup;

	/**
	 * The span of the value.
	 */
	span: ObjectSpan;

	/**
	 * The position of the value within its group.
	 */
	indexInGroup: number;
}

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

	/**
	 * Find the value a location points at among the blocks of its subject.
	 * @param location The location to resolve.
	 * @returns The value with its group and block.
	 * @throws {EditRejectionError} If no value of the predicate starts at the anchored offset.
	 */
	valueAt(location: ValueLocation): ResolvedValue {
		for (const block of this.blocksOf(location.subject)) {
			for (const group of block.groups) {
				if (group.predicateIri !== location.predicate) {
					continue;
				}

				const indexInGroup = group.objects.findIndex(span => span.start === location.anchor);

				if (indexInGroup >= 0) {
					return { block, group, span: group.objects[indexInGroup], indexInGroup };
				}
			}
		}

		throw new EditRejectionError('notFound', 'The value is no longer at the place it was shown at.');
	}
}
