import { describe, expect, it } from 'vitest';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { CellKey } from './cell-key';
import { PendingEdit, PendingEdits } from './pending-edits';

const EX = 'http://example.org/';
const subject = { kind: 'iri' as const, iri: `${EX}s` };
const cellKey = new CellKey({ resourceId: `i:${EX}s`, column: 'statement', propertyIndex: 0 });

/**
 * Wrap operations into a pending edit.
 */
function pending(operations: PendingEdit['operations'], editId = 'e1'): PendingEdit {
	return { editId, cellKey, status: 'inFlight', operations };
}

/**
 * Build a property row with one literal value.
 */
function row(predicate: string): PropertyView {
	return {
		predicate: { term: { kind: 'iri', iri: `${EX}${predicate}` }, prefixedName: `ex:${predicate}`, editable: true },
		values: [{ term: { kind: 'literal', value: predicate }, editable: true }]
	};
}

const detail: ResourceDetail = { id: `i:${EX}s`, term: subject, properties: [row('p'), row('q'), row('r')] };

/**
 * The prefixed names of the rows of a detail.
 */
function rowsOf(result: ResourceDetail): (string | undefined)[] {
	return result.properties.map(property => property.predicate.prefixedName);
}

const replace = pending([{ op: 'setValues', subject, predicate: `${EX}p`, values: [{ kind: 'term', term: { kind: 'literal', value: 'x' } }] }]);

describe('PendingEdits', () => {
	it('keeps an edit until the rows of the version it produced have arrived', () => {
		let edits = PendingEdits.NONE.submit(replace).applied('e1', 5);

		expect(edits.edits[0]).toMatchObject({ status: 'applied', appliedVersion: 5 });

		edits = edits.settle(5, [`i:${EX}other`]);
		expect(edits.edits).toHaveLength(1);

		edits = edits.settle(5, [`i:${EX}s`]);
		expect(edits.edits).toHaveLength(0);
	});

	it('drops a rejected edit right away', () => {
		expect(PendingEdits.NONE.submit(replace).rejected('e1').edits).toHaveLength(0);
	});

	it('does not settle an edit still in flight', () => {
		expect(PendingEdits.NONE.submit(replace).settle(9, [`i:${EX}s`]).edits).toHaveLength(1);
	});

	it('finds the edits touching a resource', () => {
		const edits = PendingEdits.NONE.submit(replace);

		expect(edits.editsFor(`i:${EX}s`)).toHaveLength(1);
		expect(edits.editsFor(`i:${EX}t`)).toHaveLength(0);
	});

	it('names the subject of a statement edit, the parent of a nested node and nothing for a namespace', () => {
		expect(PendingEdits.resourceIdsOf([
			{ op: 'deleteProperty', subject, predicate: `${EX}p` },
			{ op: 'addNestedNode', parent: { kind: 'bnode', id: 'b1' }, predicate: `${EX}q`, initial: [] },
			{ op: 'addNamespace', prefix: 'ex', iri: EX }
		])).toEqual([`i:${EX}s`, 'b:b1']);
	});
});

describe('PendingEdits.applyTo', () => {
	it('returns the detail itself when nothing is pending for it', () => {
		expect(PendingEdits.NONE.applyTo(detail)).toBe(detail);
		expect(PendingEdits.NONE.submit(replace).applyTo(detail)).toBe(detail);
	});

	it('removes the row of a deleted predicate', () => {
		const edits = PendingEdits.NONE.submit(pending([{ op: 'deleteProperty', subject, predicate: `${EX}q` }]));

		expect(rowsOf(edits.applyTo(detail))).toEqual(['ex:p', 'ex:r']);
	});

	it('moves the row of a predicate before another or to the end', () => {
		const before = PendingEdits.NONE.submit(pending([{ op: 'moveProperty', subject, predicate: `${EX}r`, before: `${EX}p` }]));
		const toEnd = PendingEdits.NONE.submit(pending([{ op: 'moveProperty', subject, predicate: `${EX}p` }]));

		expect(rowsOf(before.applyTo(detail))).toEqual(['ex:r', 'ex:p', 'ex:q']);
		expect(rowsOf(toEnd.applyTo(detail))).toEqual(['ex:q', 'ex:r', 'ex:p']);
	});

	it('applies the edits in order', () => {
		const edits = PendingEdits.NONE
			.submit(pending([{ op: 'moveProperty', subject, predicate: `${EX}r`, before: `${EX}p` }], 'e1'))
			.submit(pending([{ op: 'deleteProperty', subject, predicate: `${EX}p` }], 'e2'));

		expect(rowsOf(edits.applyTo(detail))).toEqual(['ex:r', 'ex:q']);
	});

	it('leaves the rows alone for a predicate the detail lacks', () => {
		expect(PendingEdits.NONE.submit(pending([{ op: 'deleteProperty', subject, predicate: `${EX}missing` }])).applyTo(detail)).toBe(detail);
		expect(PendingEdits.NONE.submit(pending([{ op: 'moveProperty', subject, predicate: `${EX}p`, before: `${EX}missing` }])).applyTo(detail)).toBe(detail);
	});
});

describe('PendingEdits.applyTo comments', () => {
	it('replaces and removes the comments of a row, and leaves other rows alone', () => {
		const set = PendingEdits.NONE.submit(pending([{ op: 'setPropertyComments', subject, predicate: `${EX}q`, comments: ['one', 'two'] }]));
		const cleared = PendingEdits.NONE.submit(pending([{ op: 'setPropertyComments', subject, predicate: `${EX}q`, comments: [] }]));
		const other = PendingEdits.NONE.submit(pending([{ op: 'setPropertyComments', subject, predicate: `${EX}missing`, comments: ['x'] }]));

		expect(set.applyTo(detail).properties.map(property => property.comments)).toEqual([undefined, ['one', 'two'], undefined]);
		expect(cleared.applyTo(set.applyTo(detail)).properties[1].comments).toBeUndefined();
		expect(other.applyTo(detail)).toBe(detail);
	});
});
