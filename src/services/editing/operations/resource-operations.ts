import { BlankNode, NamedNode } from '@rdfjs/types';
import { EditOperation } from '../edit-operation';
import { EditPlan, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { StatementLocator } from '../statement-locator';
import { SynthesisContext } from '../synthesis-context';
import { ValueOperations } from './value-operations';

/**
 * The `removeResource` operation of the edit contract.
 */
type RemoveResourceOperation = Extract<EditOperation, { op: 'removeResource' }>;

/**
 * Edits that concern a resource as a whole rather than its properties.
 */
export class ResourceOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Remove a resource described at the top level of the document: every block of statements about
	 * it goes as a whole, with the blank nodes written in it and the comments directly above it, and
	 * every statement it held is expected to be gone. Statements of other resources that refer to
	 * it stay.
	 * @param operation The operation.
	 * @returns The plan removing the blocks.
	 * @throws {EditRejectionError} If the document describes no such resource, or describes it inside
	 * another resource, which removing a value of that resource does instead.
	 */
	removeResource(operation: RemoveResourceOperation): EditPlan {
		const subject: NamedNode | BlankNode = operation.subject;
		const blocks = new StatementLocator(this._context.model).blocksOf(subject);

		if (blocks.length === 0) {
			throw new EditRejectionError({ kind: 'resourceGone' });
		}

		if (blocks.some(block => block.nested)) {
			throw new EditRejectionError({ kind: 'nodesNotSupported' });
		}

		const values = new ValueOperations(this._context);
		const plan = createPlan({});

		for (const block of blocks) {
			for (const group of block.groups) {
				for (const object of group.objects) {
					plan.expectedChanges.push(...values.removalChanges(subject, group.predicateIri, object));
				}
			}
		}

		plan.edits.push(...values.subjectDeletions(blocks));

		return plan;
	}
}
