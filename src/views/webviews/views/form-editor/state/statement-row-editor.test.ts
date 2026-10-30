import { describe, expect, it } from 'vitest';
import { RDFS, XSD } from '@faubulous/mentor-rdf';
import { TEST_NAMESPACES, TEST_SUBJECT, TEST_SUBJECT_ID, createLiteralView, createProperty, withAnchors, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { PropertyView } from '../form-editor-model';
import { TypedTermReader } from '../services/statement/typed-term-reader';
import { EditWriter } from './edit-writer';
import { StatementRowData } from './statement-row-data';
import { StatementRowEditor } from './statement-row-editor';
import { StatementRowOwner } from './statement-row-owner';

const reader = new TypedTermReader(TEST_NAMESPACES);

/**
 * The label property of the tests, anchored.
 */
const LABEL: PropertyView = withAnchors(createTestResourceDetail([{ ...createProperty('rdfs:label', [createLiteralView('Tree', 'en')]), predicate: { term: { kind: 'iri', iri: RDFS.label }, prefixedName: 'rdfs:label', editable: true } }])).properties[0];

/**
 * Make the data of a row.
 */
function dataOf(property: PropertyView | undefined, overrides: Partial<StatementRowData> = {}): StatementRowData {
	return { resourceId: TEST_SUBJECT_ID, subject: TEST_SUBJECT, property, predicateText: property ? 'rdfs:label' : '', version: 1, stale: false, reader, ...overrides };
}

/**
 * Make an editor whose writes are recorded rather than sent.
 * @param property The property of the row, or `'new'` for a row a new statement is typed into.
 * @param owner What the rows of the card answer.
 */
function createEditor(property: PropertyView | 'new' = LABEL, owner: Partial<StatementRowOwner> = {}) {
	const requested: EditWriter[] = [];
	const editor = new StatementRowEditor(1, { requestWrite: writer => requested.push(writer), flush: () => undefined }, {
		rowOf: () => undefined,
		submitted: () => undefined,
		merged: () => undefined,
		...owner
	}, dataOf(property === 'new' ? undefined : property));

	return { editor, requested };
}

describe('StatementRowEditor', () => {
	it('asks for a write when the row is left changed, and builds it when asked', () => {
		const { editor, requested } = createEditor();

		editor.inputLiteral(0, 'Oak');
		editor.leave();

		expect(requested).toEqual([editor]);
		expect(editor.takeEdit()).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Oak', language: 'en' } }] }]);
		expect(editor.ready).toBe(false);
	});

	it('waits for the version an applied edit produced, then carries what was typed meanwhile over to it', () => {
		const { editor } = createEditor();

		editor.inputLiteral(0, 'Oak');
		editor.leave();
		editor.takeEdit();
		editor.settle({ ok: true, version: 2 });
		editor.inputLiteral(0, 'Elm');

		expect(editor.ready).toBe(false);

		const delivered = { ...LABEL, values: [{ ...createLiteralView('Oak', 'en'), anchor: 500 }] };

		editor.deliver(dataOf(delivered, { version: 2 }));

		expect(editor.ready).toBe(true);
		expect(editor.state.stored.values).toEqual([{ kind: 'written', view: delivered.values[0] }]);
		expect(editor.state.draft.values).toEqual([{ kind: 'term', term: { kind: 'literal', value: 'Elm', language: 'en' } }]);
	});

	it('starts over from a delivered property when nothing typed is pending', () => {
		const { editor } = createEditor();
		const delivered = { ...LABEL, values: [{ ...createLiteralView('Baum', 'de'), anchor: 700 }] };

		editor.deliver(dataOf(delivered, { version: 2 }));

		expect(editor.state.dirty).toBe(false);
		expect(editor.state.draft.values).toEqual([{ kind: 'written', view: delivered.values[0] }]);
	});

	it('is not ready while its data is stale', () => {
		const { editor } = createEditor();

		editor.deliver(dataOf(LABEL, { stale: true }));

		expect(editor.ready).toBe(false);
	});

	it('keeps what was typed and shows the reason when the host refuses the edit', () => {
		const { editor } = createEditor();

		editor.inputLiteral(0, 'Oak');
		editor.leave();
		editor.takeEdit();
		editor.settle({ ok: false, reason: 'notFound', message: 'Gone', version: 1 });

		expect(editor.ready).toBe(true);
		expect(editor.wantsToWrite).toBe(false);
		expect(editor.state.rejection).toEqual({ kind: 'refused', reason: 'notFound', message: 'Gone' });
		expect(editor.state.draft.values[0]).toMatchObject({ kind: 'term' });

		editor.dismissRejection();

		expect(editor.state.rejection).toBeUndefined();
	});

	it('puts a literal its datatype does not take back to the stored value when the row is left', () => {
		const count: PropertyView = { ...createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true, anchor: 10 }]) };
		const { editor, requested } = createEditor(count);

		editor.inputLiteral(0, '4.5');

		expect(editor.unfittingLiterals).toEqual(new Set([0]));

		editor.leave();

		expect(editor.state.dirty).toBe(false);
		expect(requested).toEqual([]);
	});

	it('claims the predicate a rename writes', () => {
		const { editor } = createEditor();

		editor.inputPredicate('rdfs:comment');
		editor.commitPredicate();

		expect(editor.takeEdit()).toEqual([{ op: 'setPredicate', subject: TEST_SUBJECT, predicate: RDFS.label, newPredicate: RDFS.comment }]);
		expect(editor.claimedPredicate).toBe(RDFS.comment);
	});

	it('hands a new statement of a predicate the card shows to the row of that predicate', () => {
		const target = createEditor().editor;
		const merged: StatementRowEditor[] = [];
		const { editor } = createEditor('new', { rowOf: () => target, merged: row => merged.push(row) });

		editor.inputPredicate('rdfs:label');
		editor.commitPredicate();
		editor.inputPending('Baum');
		editor.leave();

		expect(editor.isOpen).toBe(false);
		expect(editor.takeEdit()).toBeUndefined();
		expect(merged).toEqual([editor]);
		expect(target.state.draft.values).toHaveLength(2);
		expect(target.wantsToWrite).toBe(true);
	});

	it('refuses a new statement of a predicate whose row only reads', () => {
		const { editor } = createEditor('new', { rowOf: () => 'notEditable' });

		editor.inputPredicate('rdfs:label');
		editor.commitPredicate();
		editor.inputPending('Baum');
		editor.leave();

		expect(editor.takeEdit()).toBeUndefined();
		expect(editor.state.rejection).toEqual({ kind: 'predicateNotEditable', predicate: RDFS.label });
		expect(editor.isOpen).toBe(true);
	});

	it('is busy from the write it asks for until the data the edit produced arrived', () => {
		const { editor } = createEditor();

		expect(editor.busy).toBe(false);

		editor.inputLiteral(0, 'Oak');
		editor.leave();

		expect(editor.busy).toBe(true);

		editor.takeEdit();
		editor.settle({ ok: true, version: 2 });

		expect(editor.busy).toBe(true);

		editor.deliver(dataOf({ ...LABEL, values: [{ ...createLiteralView('Oak', 'en'), anchor: 500 }] }, { version: 2 }));

		expect(editor.busy).toBe(false);
	});

	it('waits for nothing once retired, not even for an edit that was on its way', () => {
		const { editor } = createEditor();

		editor.inputLiteral(0, 'Oak');
		editor.leave();
		editor.takeEdit();
		editor.retire();
		editor.settle({ ok: true, version: 2 });

		expect(editor.busy).toBe(false);
	});
});

