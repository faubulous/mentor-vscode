import { ResourceDetail, ResourceId } from '../form-editor-model';
import { CellKey } from '../state/cell-key';
import { DraftLine } from '../state/draft-line';
import { DraftLines } from '../state/draft-lines';
import { LineOverrides } from '../state/line-overrides';
import { CardLine } from './card-line';
import { LineSerializer } from './line-serializer';
import { StatementRow } from './statement-row';

/**
 * What the rows of a card are built from.
 */
export interface StatementRowsInput {
	/**
	 * The resource of the card.
	 */
	resourceId: ResourceId;

	/**
	 * The resource with its properties.
	 */
	detail: ResourceDetail;

	/**
	 * The drafts the user opened.
	 */
	drafts: DraftLines;

	/**
	 * The committed texts shown until the host delivers them.
	 */
	overrides: LineOverrides;
}

/**
 * Builds the rows of a card: the lines of its properties in document order and the drafts the
 * user opened, each after the row it was opened from.
 */
export class StatementRowsBuilder {
	/**
	 * Create a builder.
	 * @param _serializer Writes the properties as lines.
	 */
	constructor(private readonly _serializer: LineSerializer) { }

	/**
	 * Build the key of the line of a property.
	 * @param resourceId The resource of the card.
	 * @param propertyIndex The index of the property.
	 * @returns The key.
	 */
	static propertyLineKey(resourceId: ResourceId, propertyIndex: number): string {
		return new CellKey({ resourceId, column: 'line', propertyIndex }).toString();
	}

	/**
	 * Build the key of a draft line.
	 * @param resourceId The resource of the card.
	 * @param draftId The identifier of the draft.
	 * @returns The key.
	 */
	static draftLineKey(resourceId: ResourceId, draftId: number): string {
		return new CellKey({ resourceId, column: 'draft', propertyIndex: draftId }).toString();
	}

	/**
	 * Build the rows.
	 * @param input The detail, drafts and overrides.
	 * @returns The rows, in order.
	 */
	build(input: StatementRowsInput): StatementRow[] {
		const rows = this._propertyLines(input).map(line => ({ line: _withOverride(line, input.overrides), source: 'property' as const }));

		return _insertDrafts(rows, input);
	}

	/**
	 * Build the lines of the properties, one per property in document order.
	 * @param input The detail of the card.
	 * @returns The lines.
	 */
	private _propertyLines(input: StatementRowsInput): CardLine[] {
		return input.detail.properties.map((property, propertyIndex) => {
			const model = this._serializer.serializeProperty(property);

			return { key: StatementRowsBuilder.propertyLineKey(input.resourceId, propertyIndex), propertyIndex, text: model.text, model, editable: property.predicate.editable };
		});
	}
}

/**
 * Show the committed text of a line while it still reads as it did when committed.
 * @param line The line.
 * @param overrides The overrides of the card.
 * @returns The line, with the committed text when the override holds.
 */
function _withOverride(line: CardLine, overrides: LineOverrides): CardLine {
	const override = overrides.get(line.key);

	return override && override.original === line.text ? { ...line, text: override.text } : line;
}

/**
 * Insert the draft rows after the rows they were opened from, or at the end.
 * @param rows The property rows.
 * @param input The drafts and overrides of the card.
 * @returns The rows with the drafts.
 */
function _insertDrafts(rows: StatementRow[], input: StatementRowsInput): StatementRow[] {
	const result = [...rows];

	for (const draft of input.drafts.all) {
		const row = _draftRow(draft, input);
		const after = draft.afterKey === undefined ? -1 : result.findIndex(existing => existing.line.key === draft.afterKey);
		const before = draft.beforeKey === undefined ? -1 : result.findIndex(existing => existing.line.key === draft.beforeKey);

		if (after >= 0) {
			result.splice(after + 1, 0, row);
		} else if (before >= 0) {
			result.splice(before, 0, row);
		} else {
			result.push(row);
		}
	}

	return result;
}

/**
 * Make the row of a draft line.
 * @param draft The draft.
 * @param input The overrides of the card.
 * @returns The row.
 */
function _draftRow(draft: DraftLine, input: StatementRowsInput): StatementRow {
	const key = StatementRowsBuilder.draftLineKey(input.resourceId, draft.id);
	const text = draft.committed ?? input.overrides.get(key)?.text ?? '';

	return { line: { key, text, editable: true }, source: 'draft', draftId: draft.id };
}
