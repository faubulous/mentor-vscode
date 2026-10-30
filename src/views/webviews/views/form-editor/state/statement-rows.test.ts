import { describe, expect, it } from 'vitest';
import { TEST_NAMESPACES, TEST_SUBJECT, TEST_SUBJECT_ID, createIriView, createProperty, createSampleResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { PropertyView } from '../form-editor-model';
import { TypedTermReader } from '../services/statement/typed-term-reader';
import { StatementRows, StatementRowsData } from './statement-rows';

const reader = new TypedTermReader(TEST_NAMESPACES);
const SAMPLE = withAnchors(createSampleResourceDetail()).properties;

/**
 * Make the data of a card.
 */
function dataOf(properties: readonly PropertyView[], version = 1): StatementRowsData {
	return { resourceId: TEST_SUBJECT_ID, subject: TEST_SUBJECT, properties, version, stale: false, reader, predicateTextOf: property => property.predicate.prefixedName ?? '' };
}

/**
 * Make the rows of a card whose writes go nowhere.
 */
function createRows(): StatementRows {
	return new StatementRows({ requestWrite: () => undefined, flush: () => undefined });
}

describe('StatementRows', () => {
	it('gives every editable property a row and opens a row for a new statement after them', () => {
		const entries = createRows().reconcile(dataOf(SAMPLE));

		expect(entries.map(entry => entry.property?.predicate.prefixedName ?? 'new')).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'new']);
		expect(entries.every(entry => entry.editor !== undefined)).toBe(true);
	});

	it('keeps the row of a predicate wherever its property moves', () => {
		const rows = createRows();
		const before = rows.reconcile(dataOf(SAMPLE));
		const after = rows.reconcile(dataOf([SAMPLE[2], SAMPLE[0], SAMPLE[1]], 2));

		expect(after[0].editor).toBe(before[2].editor);
		expect(after[0].key).toBe(before[2].key);
		expect(after[3].editor).toBe(before[3].editor);
	});

	it('drops and retires the row of a property that went, and keeps one row open for a new statement', () => {
		const rows = createRows();
		const before = rows.reconcile(dataOf(SAMPLE));
		const label = before[1].editor!;

		label.inputLiteral(0, 'Oak');
		label.leave();

		const entries = rows.reconcile(dataOf([SAMPLE[0]], 2));

		expect(entries).toHaveLength(2);
		expect(entries[1].editor?.isOpen).toBe(true);
		expect(label.busy).toBe(false);
	});

	it('reads a property whose values cannot all be kept by their place, and names it as one the rows cannot edit', () => {
		const rows = createRows();
		const unanchored = createProperty('ex:p', [createIriView('ex:A', 'A')]);
		const entries = rows.reconcile(dataOf([unanchored, SAMPLE[1]]));

		expect(entries[0].editor).toBeUndefined();
		expect(rows.rowOf('http://example.org/p')).toBe('notEditable');
		expect(rows.rowOf(SAMPLE[1].predicate.term.kind === 'iri' ? SAMPLE[1].predicate.term.iri : '')).toBe(entries[1].editor);
	});
});
