import { describe, expect, it } from 'vitest';
import { OWL, RDF, RDFS, SKOS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createSampleResourceDetail, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
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
 */
function createRows(): StatementRows {
	return new StatementRows({ requestWrite: () => undefined, flush: () => undefined });
}

/**
 * Make the rows of the nested card of a blank node, which the type leads.
 */
function createBoxRows(): StatementRows {
	return new StatementRows({ requestWrite: () => undefined, flush: () => undefined }, { leadingRow: { predicates: [RDF.type], predicateText: 'a' } });
}

describe('StatementRows', () => {
	it('gives every editable property a row, and none for a new statement until one is asked for', () => {
		const entries = createRows().reconcile(dataOf(SAMPLE));

		expect(entries.map(entry => entry.property?.predicate.prefixedName ?? 'new')).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);
		expect(entries.every(entry => entry.editor !== undefined)).toBe(true);
	});

	it('keeps the row of a predicate wherever its property moves', () => {
		const rows = createRows();
		const before = rows.reconcile(dataOf(SAMPLE));
		const after = rows.reconcile(dataOf([SAMPLE[2], SAMPLE[0], SAMPLE[1]], 2));

		expect(after[0].editor).toBe(before[2].editor);
		expect(after[0].key).toBe(before[2].key);
	});

	it('drops and retires the row of a property that went, and keeps the row open for a new statement', () => {
		const rows = createRows();
		const before = rows.reconcile(dataOf(SAMPLE));
		const label = before[1].editor!;
		const added = rows.addRow()!;

		label.inputLiteral(0, 'Oak');
		label.leave();

		const entries = rows.reconcile(dataOf([SAMPLE[0]], 2));

		expect(entries).toHaveLength(2);
		expect(entries[1].editor).toBe(added);
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

	it('opens a row for a new statement on request, once, and closes it when it is left empty', () => {
		const rows = createRows();

		expect(rows.addRow()).toBeUndefined();

		rows.reconcile(dataOf(SAMPLE));

		const added = rows.addRow()!;

		expect(rows.revision).toBe(1);
		expect(rows.addRow()).toBe(added);
		expect(lastOf(rows.reconcile(dataOf(SAMPLE)))?.editor).toBe(added);

		added.leave();

		expect(rows.revision).toBe(2);
		expect(rows.reconcile(dataOf(SAMPLE)).map(entry => entry.editor)).not.toContain(added);
	});

	it('keeps a row opened on request once something is typed into it, and after Escape closes it', () => {
		const rows = createRows();

		rows.reconcile(dataOf(SAMPLE));

		const added = rows.addRow()!;

		added.inputPredicate('rdfs:comment');
		added.leave();

		expect(lastOf(rows.reconcile(dataOf(SAMPLE)))?.editor).toBe(added);

		added.revert();

		expect(rows.reconcile(dataOf(SAMPLE)).map(entry => entry.editor)).not.toContain(added);
	});

	it('leads the rows of a nested card with the type, wherever the type is written', () => {
		const entries = createBoxRows().reconcile(dataOf([SAMPLE[1], SAMPLE[2], SAMPLE[0]]));

		expect(entries.map(entry => [entry.property?.predicate.prefixedName ?? 'new', entry.isLeading === true])).toEqual([['rdf:type', true], ['rdfs:label', false], ['rdfs:subClassOf', false]]);
	});

	it('stands in for the type of an untyped node with a row of rdf:type, which Add property and leaving it leave alone', () => {
		const rows = createBoxRows();
		const entries = rows.reconcile(dataOf([SAMPLE[1]]));
		const placeholder = entries[0];

		expect(placeholder.isLeading).toBe(true);
		expect(placeholder.property).toBeUndefined();
		expect(placeholder.editor?.state.stored.predicate).toBe(RDF.type);
		expect(entries).toHaveLength(2);

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

	it('leads the rows of a card of the list with its most preferred label, and stands in for a missing one', () => {
		const label = createProperty('skos:prefLabel', [createLiteralView('Tree')]);
		const otherLabel = createProperty('rdfs:label', [createLiteralView('A tree')]);
		const rows = new StatementRows({ requestWrite: () => undefined, flush: () => undefined }, { leadingRow: { predicates: [SKOS.prefLabel, RDFS.label], predicateText: 'skos:prefLabel' } });
		const entries = rows.reconcile(dataOf(withAnchors(createTestResourceDetail([otherLabel, label])).properties));

		expect(entries.map(entry => [entry.property?.predicate.prefixedName ?? 'new', entry.isLeading === true])).toEqual([['skos:prefLabel', true], ['rdfs:label', false]]);

		const unlabelled = new StatementRows({ requestWrite: () => undefined, flush: () => undefined }, { leadingRow: { predicates: [SKOS.prefLabel], predicateText: 'skos:prefLabel' } }).reconcile(dataOf([SAMPLE[0]]));

		expect(unlabelled.map(entry => entry.isLeading === true)).toEqual([true, false]);
		expect(unlabelled[0].editor?.state.stored.predicate).toBe(SKOS.prefLabel);
	});
});
