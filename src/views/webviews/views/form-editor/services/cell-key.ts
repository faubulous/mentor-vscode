import { FocusHint, ResourceId } from '../form-editor-model';

/**
 * Identifies one focusable cell of the form:
 * `<resourceId>|<column>|<propertyIndex>|<valueIndex>|<itemIndex>`, the last segment naming an
 * item inside a collection value. Cells carry it in their `data-cell` attribute, so focus can be
 * restored by a DOM query after the rows re-render from new data.
 */
export type CellKey = string;

/**
 * The column a cell belongs to. A `line` is a statement written as one line and a `draft` the
 * line a new statement is typed into.
 */
export type CellColumn = 'subject' | 'predicate' | 'value' | 'addProperty' | 'line' | 'draft';

/**
 * The parsed form of a {@link CellKey}.
 */
export interface CellAddress {
	/**
	 * The resource the cell belongs to.
	 */
	resourceId: ResourceId;

	/**
	 * The column of the cell.
	 */
	column: CellColumn;

	/**
	 * The property row, for a cell within the rows.
	 */
	propertyIndex?: number;

	/**
	 * The value within the row, for a value cell.
	 */
	valueIndex?: number;

	/**
	 * The item within a collection value.
	 */
	itemIndex?: number;
}

/**
 * Build the key of a cell.
 * @param address The cell address.
 * @returns The key.
 */
export function buildCellKey(address: CellAddress): CellKey {
	return `${address.resourceId}|${address.column}|${address.propertyIndex ?? ''}|${address.valueIndex ?? ''}|${address.itemIndex ?? ''}`;
}

/**
 * Parse a cell key. Resource identifiers may contain `|`, so the key is split from the end.
 * @param key The key to parse.
 * @returns The address, or `undefined` if the key is malformed.
 */
export function parseCellKey(key: CellKey): CellAddress | undefined {
	const parts = key.split('|');

	if (parts.length < 5) {
		return undefined;
	}

	const itemIndex = parts.pop()!;
	const valueIndex = parts.pop()!;
	const propertyIndex = parts.pop()!;
	const column = parts.pop() as CellColumn;

	return {
		resourceId: parts.join('|'),
		column,
		propertyIndex: _indexOf(propertyIndex),
		valueIndex: _indexOf(valueIndex),
		itemIndex: _indexOf(itemIndex)
	};
}

/**
 * Get the resource a cell belongs to.
 * @param key The cell key.
 * @returns The resource identifier.
 */
export function resourceIdOfCell(key: CellKey): ResourceId {
	return parseCellKey(key)?.resourceId ?? key;
}

/**
 * Translate the focus hint of an applied edit into a cell key. Statements are edited as lines,
 * so a hint on a predicate or a value lands on the line of its property, and a hint to add a
 * property, as for a new nested node, on its first line.
 * @param hint The hint sent by the host.
 * @returns The key of the cell to focus.
 */
export function cellKeyFromFocusHint(hint: FocusHint): CellKey {
	switch (hint.target) {
		case 'subject':
			return buildCellKey({ resourceId: hint.resourceId, column: 'subject' });
		case 'addProperty':
			return buildCellKey({ resourceId: hint.resourceId, column: 'line', propertyIndex: 0 });
		default:
			return buildCellKey({ resourceId: hint.resourceId, column: 'line', propertyIndex: hint.propertyIndex ?? 0 });
	}
}

/**
 * Read an index segment of a key.
 * @param segment The segment.
 * @returns The index, or `undefined` for an empty segment.
 */
function _indexOf(segment: string): number | undefined {
	return segment === '' ? undefined : Number(segment);
}
