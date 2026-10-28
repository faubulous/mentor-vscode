import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE } from '@src/utilities/mocks/line-fixtures';
import { createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { DraftLines } from './draft-lines';

describe('DraftLines', () => {
	it('opens drafts with rising identifiers where they were asked for', () => {
		const drafts = DraftLines.NONE.open({ afterKey: 'a' }).open();

		expect(drafts.all).toEqual([{ id: 1, afterKey: 'a' }, { id: 2 }]);
		expect(drafts.newest).toEqual({ id: 2 });
		expect(DraftLines.NONE.newest).toBeUndefined();
	});

	it('records a commit and closes a draft', () => {
		const drafts = DraftLines.NONE.open().open().committed(1, 'ex:p ex:a', `${EXAMPLE_NAMESPACE}p`, false);

		expect(drafts.all[0]).toEqual({ id: 1, committed: 'ex:p ex:a', predicate: `${EXAMPLE_NAMESPACE}p`, statedBefore: false });
		expect(drafts.without(2).all.map(draft => draft.id)).toEqual([1]);
		expect(drafts.without(9)).toBe(drafts);
	});

	it('keeps numbering after a draft was closed', () => {
		expect(DraftLines.NONE.open().without(1).open().newest?.id).toBe(2);
	});

	it('drops a committed draft once the resource states its new predicate', () => {
		const drafts = DraftLines.NONE.open().open().open()
			.committed(1, 'ex:p ex:a', `${EXAMPLE_NAMESPACE}p`, false)
			.committed(3, 'a ex:T', RDF.type, true);
		const detail = createTestResourceDetail([createProperty('rdf:type', []), createProperty('ex:p', [])]);

		expect(drafts.prune(detail).all.map(draft => draft.id)).toEqual([2, 3]);
		const remaining = drafts.without(1);

		expect(remaining.prune(detail)).toBe(remaining);
	});
});
