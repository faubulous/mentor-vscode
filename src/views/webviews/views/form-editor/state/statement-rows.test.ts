import { describe, expect, it } from 'vitest';
import { OWL, RDF } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { TEST_NAMESPACES, TEST_SUBJECT, createIriView, createProperty, createSampleResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { PropertyView } from '../form-editor-model';
import { TypedTermReader } from '../services/statement/typed-term-reader';
import { StatementRowEntry, StatementRows, StatementRowsData } from './statement-rows';

const reader = new TypedTermReader(TEST_NAMESPACES);
const SAMPLE = withAnchors(createSampleResourceDetail()).properties;

/**
 * Make the data of a card.
 */
function dataOf(properties: readonly PropertyView[], version = 1): StatementRowsData {
	return { subject: TEST_SUBJECT, card: TEST_SUBJECT, properties, version, stale: false, reader, predicateTextOf: property => property.predicate.prefixedName ?? '' };
}

/**
 * The last of the rows of a card.
 */
function lastOf(entries: readonly StatementRowEntry[]): StatementRowEntry | undefined {
	return entries[entries.length - 1];
}

/**
 * Make the rows of a card whose writes go nowhere.
 * @param keepNewRowOpen Whether a row for a new statement is always open, as in a card of the list.
 */
function createRows(keepNewRowOpen = true): StatementRows {
	return new StatementRows({ requestWrite: () => undefined, flush: () => undefined }, { keepNewRowOpen });
}

/**
 * Make the rows of the nested card of a blank node, which the type leads.
 */
function createBoxRows(): StatementRows {
	return new StatementRows({ requestWrite: () => undefined, flush: () => undefined }, { keepNewRowOpen: false, typeRow: true });
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
		expect(rows.rowOf(SAMPLE[1].predicate.term.termType === 'NamedNode' ? SAMPLE[1].predicate.term.value : '')).toBe(entries[1].editor);
	});

	it('opens a row for a new statement only on request in the nested card of a blank node, and closes it when it is left empty', () => {
		const rows = createRows(false);
		const entries = rows.reconcile(dataOf(SAMPLE));

		expect(entries.map(entry => entry.property?.predicate.prefixedName ?? 'new')).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);

		const added = rows.addRow()!;

		expect(rows.revision).toBe(1);
		expect(rows.addRow()).toBe(added);
		expect(lastOf(rows.reconcile(dataOf(SAMPLE)))?.editor).toBe(added);

		added.leave();

		expect(rows.revision).toBe(2);
		expect(rows.reconcile(dataOf(SAMPLE)).map(entry => entry.editor)).not.toContain(added);
	});

	it('keeps the open row for a new statement of a card of the list when it is left empty', () => {
		const rows = createRows();
		const open = lastOf(rows.reconcile(dataOf(SAMPLE)))!.editor!;

		open.leave();

		expect(lastOf(rows.reconcile(dataOf(SAMPLE)))?.editor).toBe(open);
	});

	it('keeps a row opened on request once something is typed into it', () => {
		const rows = createRows(false);

		rows.reconcile(dataOf(SAMPLE));

		const added = rows.addRow()!;

		added.inputPredicate('rdfs:comment');
		added.leave();

		expect(lastOf(rows.reconcile(dataOf(SAMPLE)))?.editor).toBe(added);
	});

	it('leads the rows of a nested card with the type, wherever the type is written', () => {
		const entries = createBoxRows().reconcile(dataOf([SAMPLE[1], SAMPLE[2], SAMPLE[0]]));

		expect(entries.map(entry => [entry.property?.predicate.prefixedName, entry.isType === true])).toEqual([['rdf:type', true], ['rdfs:label', false], ['rdfs:subClassOf', false]]);
	});

	it('stands in for the type of an untyped node with a row of rdf:type that Add property and leaving it leave alone', () => {
		const rows = createBoxRows();
		const placeholder = rows.reconcile(dataOf([SAMPLE[1]]))[0];

		expect(placeholder.isType).toBe(true);
		expect(placeholder.property).toBeUndefined();
		expect(placeholder.editor?.state.stored.predicate).toBe(RDF.type);

		placeholder.editor!.leave();

		const added = rows.addRow();

		expect(added).not.toBe(placeholder.editor);
		expect(rows.reconcile(dataOf([SAMPLE[1]]))[0].editor).toBe(placeholder.editor);
	});

	it('writes the type picked in the row that stands in for it, which then holds the type that arrives', () => {
		const rows = createBoxRows();
		const editor = rows.reconcile(dataOf([SAMPLE[1]]))[0].editor!;

		editor.addValue(RdfDataFactory.namedNode(OWL.Class));
		editor.leave();

		expect(editor.takeEdit()).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDF.type, values: [{ kind: 'term', term: RdfDataFactory.namedNode(OWL.Class) }] }]);

		const entries = rows.reconcile(dataOf([SAMPLE[0], SAMPLE[1]], 2));

		expect(entries[0].editor).toBe(editor);
		expect(entries[0].property).toBe(SAMPLE[0]);
		expect(entries).toHaveLength(2);
	});
});
