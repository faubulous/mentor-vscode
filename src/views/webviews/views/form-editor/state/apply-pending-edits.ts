import { EditOperation } from '@src/services/editing/edit-operation';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { PendingEdit } from './pending-edits';

/**
 * Show the pending edits of a resource on top of its last known detail, so the form reflects a
 * change the moment it is made and does not flicker while the host applies it. A removed
 * predicate loses its row and a moved one changes its place right away; a rewritten statement
 * keeps its row until the host answers, as showing the new line before that needs the line
 * parser.
 * @param detail The detail as last delivered.
 * @param edits The pending edits touching the resource.
 * @returns The detail with the edits applied, or the detail itself when nothing shows.
 */
export function applyPendingEdits(detail: ResourceDetail, edits: readonly PendingEdit[]): ResourceDetail {
	let properties = detail.properties;

	for (const edit of edits) {
		for (const operation of edit.operations) {
			properties = _applyOperation(properties, operation);
		}
	}

	return properties === detail.properties ? detail : { ...detail, properties };
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
		default:
			return properties;
	}
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
