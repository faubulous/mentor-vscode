import { FocusHint, ResourceId } from '../form-editor-model';

/**
 * The column a cell belongs to. A `line` is a statement written as one line and a `draft` the
 * line a new statement is typed into.
 */
export type CellColumn = 'subject' | 'predicate' | 'value' | 'addProperty' | 'line' | 'draft';

/**
 * The columns that make up a property row.
 */
const ROW_COLUMNS: ReadonlySet<CellColumn> = new Set<CellColumn>(['predicate', 'value', 'line']);

/**
 * The parts that address a cell.
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
 * Identifies one focusable cell of the form. Cells carry its text form,
 * `<resourceId>|<column>|<propertyIndex>|<valueIndex>|<itemIndex>`, in their `data-cell`
 * attribute, so the focus can be restored by a DOM query after the rows re-render from new data.
 */
export class CellKey implements CellAddress {
	readonly resourceId: ResourceId;

	readonly column: CellColumn;

	readonly propertyIndex?: number;

	readonly valueIndex?: number;

	readonly itemIndex?: number;

	/**
	 * Create the key of a cell.
	 * @param address The parts that address the cell.
	 */
	constructor(address: CellAddress) {
		this.resourceId = address.resourceId;
		this.column = address.column;
		this.propertyIndex = address.propertyIndex;
		this.valueIndex = address.valueIndex;
		this.itemIndex = address.itemIndex;
	}

	/**
	 * Read a key from its text form. Resource identifiers may contain `|`, so the text is split
	 * from the end.
	 * @param text The text form of a key.
	 * @returns The key, or `undefined` if the text is malformed.
	 */
	static parse(text: string): CellKey | undefined {
		const parts = text.split('|');

		if (parts.length < 5) {
			return undefined;
		}

		const itemIndex = _indexOf(parts.pop()!);
		const valueIndex = _indexOf(parts.pop()!);
		const propertyIndex = _indexOf(parts.pop()!);
		const column = parts.pop() as CellColumn;

		return new CellKey({ resourceId: parts.join('|'), column, propertyIndex, valueIndex, itemIndex });
	}

	/**
	 * Translate the focus hint of an applied edit into the key of the cell to focus. Statements
	 * are edited as lines, so a hint on a predicate or a value lands on the line of its property,
	 * and a hint to add a property, as for a new nested node, on its first line.
	 * @param hint The hint sent by the host.
	 * @returns The key.
	 */
	static fromFocusHint(hint: FocusHint): CellKey {
		switch (hint.target) {
			case 'subject':
				return new CellKey({ resourceId: hint.resourceId, column: 'subject' });
			case 'addProperty':
				return new CellKey({ resourceId: hint.resourceId, column: 'line', propertyIndex: 0 });
			default:
				return new CellKey({ resourceId: hint.resourceId, column: 'line', propertyIndex: hint.propertyIndex ?? 0 });
		}
	}

	/**
	 * Indicate whether another key addresses the same cell.
	 * @param other The other key.
	 * @returns `true` for the same cell.
	 */
	equals(other: CellKey | undefined): boolean {
		return other !== undefined && this.toString() === other.toString();
	}

	/**
	 * Indicate whether the cell is part of a property row.
	 * @param resourceId The resource of the row.
	 * @param propertyIndex The row.
	 * @returns `true` when the cell is one of the row's.
	 */
	isInRow(resourceId: ResourceId, propertyIndex: number): boolean {
		return this.resourceId === resourceId && this.propertyIndex === propertyIndex && ROW_COLUMNS.has(this.column);
	}

	/**
	 * The text form of the key, as the cells carry it.
	 * @returns The text.
	 */
	toString(): string {
		return `${this.resourceId}|${this.column}|${this.propertyIndex ?? ''}|${this.valueIndex ?? ''}|${this.itemIndex ?? ''}`;
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
