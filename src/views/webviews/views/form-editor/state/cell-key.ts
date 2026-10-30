import { FocusHint, ResourceId } from '../form-editor-model';

/**
 * The kinds of row of a card that take the focus: the statement of a property, the row a new
 * statement is typed into, and a run of comment lines.
 */
export type CellColumn = 'statement' | 'draft' | 'comment';

/**
 * The parts that address a row of a card.
 */
export interface CellAddress {
	/**
	 * The resource the row belongs to.
	 */
	resourceId: ResourceId;

	/**
	 * The kind of row.
	 */
	column: CellColumn;

	/**
	 * The property of a statement row, the draft of a draft row, or the property a comment run
	 * introduces.
	 */
	propertyIndex?: number;

	/**
	 * The value within a statement row that takes the focus.
	 */
	valueIndex?: number;
}

/**
 * Identifies one row of the form that takes the focus. Rows carry its text form in their
 * `data-cell` attribute, so the focus can be restored by a DOM query after the rows re-render
 * from new data.
 */
export class CellKey implements CellAddress {
	readonly resourceId: ResourceId;

	readonly column: CellColumn;

	readonly propertyIndex?: number;

	readonly valueIndex?: number;

	/**
	 * Create the key of a row.
	 * @param address The parts that address the row.
	 */
	constructor(address: CellAddress) {
		this.resourceId = address.resourceId;
		this.column = address.column;
		this.propertyIndex = address.propertyIndex;
		this.valueIndex = address.valueIndex;
	}

	/**
	 * Translate the focus hint of an applied edit into the key of the row to focus. Every target
	 * of a statement lands on the row of its property; a new resource or nested node, which has
	 * no row of its own yet, on the first row of the resource.
	 * @param hint The hint sent by the host.
	 * @returns The key.
	 */
	static fromFocusHint(hint: FocusHint): CellKey {
		if (hint.target === 'comment') {
			return new CellKey({ resourceId: hint.resourceId, column: 'comment', propertyIndex: hint.propertyIndex });
		}

		return new CellKey({ resourceId: hint.resourceId, column: 'statement', propertyIndex: hint.propertyIndex ?? 0, valueIndex: hint.target === 'value' ? hint.valueIndex : undefined });
	}

	/**
	 * Indicate whether another key addresses the same row and value.
	 * @param other The other key.
	 * @returns `true` for the same row and value.
	 */
	equals(other: CellKey | undefined): boolean {
		return other !== undefined && this.toString() === other.toString();
	}

	/**
	 * Indicate whether the key addresses the statement row of a property.
	 * @param resourceId The resource of the row.
	 * @param propertyIndex The property of the row.
	 * @returns `true` for that row.
	 */
	isInRow(resourceId: ResourceId, propertyIndex: number): boolean {
		return this.resourceId === resourceId && this.propertyIndex === propertyIndex && this.column === 'statement';
	}

	/**
	 * The key of the row alone, without the value within it, as the row element carries it.
	 * @returns The key of the row.
	 */
	row(): CellKey {
		return this.valueIndex === undefined ? this : new CellKey({ resourceId: this.resourceId, column: this.column, propertyIndex: this.propertyIndex });
	}

	/**
	 * The text form of the key, as the rows carry it in their `data-cell` attribute.
	 * @returns The text.
	 */
	toString(): string {
		return [this.resourceId, this.column, this.propertyIndex ?? '', this.valueIndex ?? ''].join('|');
	}
}
