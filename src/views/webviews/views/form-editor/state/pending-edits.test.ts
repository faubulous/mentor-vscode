import { describe, expect, it } from 'vitest';
import { PendingEdit, pendingEditsFor, pendingEditsReducer, resourceIdsOf } from './pending-edits';

const EX = 'http://example.org/';
const subject = { kind: 'iri' as const, iri: `${EX}s` };

const edit: PendingEdit = {
	editId: 'e1',
	cellKey: `i:${EX}s|line|0||`,
	status: 'inFlight',
	operations: [{ op: 'replaceStatement', subject, predicate: `${EX}p`, text: 'ex:p "x"' }]
};

describe('pendingEditsReducer', () => {
	it('keeps an edit until the rows of the version it produced have arrived', () => {
		let state = pendingEditsReducer([], { type: 'submit', edit });

		state = pendingEditsReducer(state, { type: 'applied', editId: 'e1', version: 5 });
		expect(state[0]).toMatchObject({ status: 'applied', appliedVersion: 5 });

		state = pendingEditsReducer(state, { type: 'settle', version: 5, resourceIds: [`i:${EX}other`] });
		expect(state).toHaveLength(1);

		state = pendingEditsReducer(state, { type: 'settle', version: 5, resourceIds: [`i:${EX}s`] });
		expect(state).toHaveLength(0);
	});

	it('drops a rejected edit right away', () => {
		expect(pendingEditsReducer([edit], { type: 'rejected', editId: 'e1' })).toHaveLength(0);
	});

	it('does not settle an edit still in flight', () => {
		expect(pendingEditsReducer([edit], { type: 'settle', version: 9, resourceIds: [`i:${EX}s`] })).toHaveLength(1);
	});
});

describe('pendingEditsFor', () => {
	it('finds the edits touching a resource', () => {
		expect(pendingEditsFor([edit], `i:${EX}s`)).toHaveLength(1);
		expect(pendingEditsFor([edit], `i:${EX}t`)).toHaveLength(0);
	});
});

describe('resourceIdsOf', () => {
	it('names the subject of a statement edit, the parent of a nested node and nothing for a namespace', () => {
		expect(resourceIdsOf([
			{ op: 'deleteProperty', subject, predicate: `${EX}p` },
			{ op: 'addNestedNode', parent: { kind: 'bnode', id: 'b1' }, predicate: `${EX}q`, initial: [] },
			{ op: 'addNamespace', prefix: 'ex', iri: EX }
		])).toEqual([`i:${EX}s`, 'b:b1']);
	});
});
