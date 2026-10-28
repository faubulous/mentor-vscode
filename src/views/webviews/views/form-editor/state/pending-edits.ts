import { EditOperation } from '@src/services/editing/edit-operation';
import { getTermRefResourceId } from '@src/services/editing/resource-id';
import { PropertyView, ResourceDetail, ResourceId, TermRef } from '../form-editor-model';
import { CellKey } from './cell-key';

/**
 * An edit the user made that the document does not show yet, either because the host is still
 * applying it or because the re-rendered rows for the new version have not arrived.
 */
export interface PendingEdit {
	/**
	 * The identifier the edit is reported back by.
	 */
	editId: string;

	/**
	 * The operations of the edit.
	 */
	operations: EditOperation[];

	/**
	 * The cell the edit was made from, where an error is shown if it fails.
	 */
	cellKey: CellKey;

	/**
	 * Whether the host is still applying the edit or has applied it.
	 */
	status: 'inFlight' | 'applied';

	/**
	 * The document version the edit produced, once applied.
	 */
	appliedVersion?: number;
}

/**
 * The edits between submission and the arrival of the rows that show them. Immutable: every
 * transition returns the next edits. The edits of a resource are shown on top of its last known
 * detail, so the form reflects a change the moment it is made and does not flicker while the
 * host applies it.
 */
export class PendingEdits {
	/**
	 * No pending edits.
	 */
	static readonly NONE = new PendingEdits([]);

	/**
	 * Create the pending edits.
	 * @param edits The edits, oldest first.
	 */
	constructor(readonly edits: readonly PendingEdit[]) { }

	/**
	 * Get the resources the operations of an edit describe.
	 * @param operations The operations.
	 * @returns The resource identifiers, each once.
	 */
	static resourceIdsOf(operations: readonly EditOperation[]): ResourceId[] {
		const ids = new Set<ResourceId>();

		for (const operation of operations) {
			const subject = _subjectOf(operation);
			const id = subject ? getTermRefResourceId(subject) : undefined;

			if (id !== undefined) {
				ids.add(id);
			}
		}

		return Array.from(ids);
	}

	/**
	 * Add an edit handed to the host.
	 * @param edit The edit.
	 * @returns The next edits.
	 */
	submit(edit: PendingEdit): PendingEdits {
		return new PendingEdits([...this.edits, edit]);
	}

	/**
	 * Note that the host applied an edit.
	 * @param editId The edit.
	 * @param version The document version it produced.
	 * @returns The next edits.
	 */
	applied(editId: string, version: number): PendingEdits {
		return new PendingEdits(this.edits.map(edit => edit.editId === editId ? { ...edit, status: 'applied', appliedVersion: version } : edit));
	}

	/**
	 * Drop an edit the host did not apply.
	 * @param editId The edit.
	 * @returns The next edits.
	 */
	rejected(editId: string): PendingEdits {
		return new PendingEdits(this.edits.filter(edit => edit.editId !== editId));
	}

	/**
	 * Drop the applied edits whose resources arrived re-rendered for the version they produced.
	 * @param version The document version the rows belong to.
	 * @param resourceIds The resources whose rows arrived.
	 * @returns The next edits.
	 */
	settle(version: number, resourceIds: readonly ResourceId[]): PendingEdits {
		const settled = new Set(resourceIds);

		return new PendingEdits(this.edits.filter(edit => !(
			edit.status === 'applied'
			&& edit.appliedVersion !== undefined
			&& edit.appliedVersion <= version
			&& PendingEdits.resourceIdsOf(edit.operations).every(id => settled.has(id))
		)));
	}

	/**
	 * Get the edits that touch a resource.
	 * @param resourceId The resource.
	 * @returns The edits.
	 */
	editsFor(resourceId: ResourceId): PendingEdit[] {
		return this.edits.filter(edit => PendingEdits.resourceIdsOf(edit.operations).includes(resourceId));
	}

	/**
	 * Show the edits of a resource on top of its last known detail. A removed predicate loses its
	 * row and a moved one changes its place right away; a rewritten statement keeps its row until
	 * the host answers, as showing the new line before that needs the line parser.
	 * @param detail The detail as last delivered.
	 * @returns The detail with the edits applied, or the detail itself when nothing shows.
	 */
	applyTo(detail: ResourceDetail): ResourceDetail {
		let properties = detail.properties;

		for (const edit of this.editsFor(detail.id)) {
			for (const operation of edit.operations) {
				properties = _applyOperation(properties, operation);
			}
		}

		return properties === detail.properties ? detail : { ...detail, properties };
	}
}

/**
 * Get the subject an operation acts on, if it acts on one.
 * @param operation The operation.
 * @returns The subject, or `undefined` for an operation on the document as a whole.
 */
function _subjectOf(operation: EditOperation): TermRef | undefined {
	if ('subject' in operation) {
		return operation.subject;
	}

	if ('parent' in operation) {
		return operation.parent;
	}

	return undefined;
}

/**
 * Apply one operation to the property rows.
 * @param properties The rows.
 * @param operation The operation.
 * @returns The rows with the operation applied, the same array when it changes none.
 */
function _applyOperation(properties: PropertyView[], operation: EditOperation): PropertyView[] {
	switch (operation.op) {
		case 'deleteProperty':
			return _deleteProperty(properties, operation.predicate);
		case 'moveProperty':
			return _moveProperty(properties, operation.predicate, operation.before);
		case 'setPropertyComments':
			return _setPropertyComments(properties, operation.predicate, operation.comments);
		default:
			return properties;
	}
}

/**
 * Replace the comment lines introducing the row of a predicate.
 * @param properties The rows.
 * @param predicate The predicate.
 * @param comments The comment lines, none to remove them.
 * @returns The rows with the comments replaced, the same array when there is no such row.
 */
function _setPropertyComments(properties: PropertyView[], predicate: string, comments: string[]): PropertyView[] {
	if (!properties.some(property => _iriOf(property) === predicate)) {
		return properties;
	}

	return properties.map(property => _iriOf(property) === predicate ? { ...property, comments: comments.length > 0 ? comments : undefined } : property);
}

/**
 * Remove the row of a predicate.
 * @param properties The rows.
 * @param predicate The predicate.
 * @returns The rows without it, the same array when there is no such row.
 */
function _deleteProperty(properties: PropertyView[], predicate: string): PropertyView[] {
	const remaining = properties.filter(property => _iriOf(property) !== predicate);

	return remaining.length === properties.length ? properties : remaining;
}

/**
 * Move the row of a predicate before the row of another, or to the end.
 * @param properties The rows.
 * @param predicate The predicate to move.
 * @param before The predicate to move it before, or `undefined` for the end.
 * @returns The rows in their new order, the same array when nothing moves.
 */
function _moveProperty(properties: PropertyView[], predicate: string, before: string | undefined): PropertyView[] {
	const from = properties.findIndex(property => _iriOf(property) === predicate);

	if (from < 0) {
		return properties;
	}

	const rest = properties.filter((_, index) => index !== from);
	const to = before === undefined ? rest.length : rest.findIndex(property => _iriOf(property) === before);

	if (to < 0) {
		return properties;
	}

	return [...rest.slice(0, to), properties[from], ...rest.slice(to)];
}

/**
 * The IRI of the predicate of a row.
 * @param property The row.
 * @returns The IRI, or `undefined` for a predicate that is not an IRI.
 */
function _iriOf(property: PropertyView): string | undefined {
	return property.predicate.term.kind === 'iri' ? property.predicate.term.iri : undefined;
}
