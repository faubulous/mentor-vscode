import { describe, expect, it } from 'vitest';
import { StatementDrafts } from './statement-drafts';

describe('StatementDrafts', () => {
	it('opens drafts with rising identifiers and keeps the last one open', () => {
		const drafts = StatementDrafts.NONE.opened().opened();

		expect(drafts.all.map(draft => draft.id)).toEqual([1, 2]);
		expect(drafts.open?.id).toBe(2);
		expect(StatementDrafts.NONE.open).toBeUndefined();
	});

	it('closes the open draft once it is submitted and drops submitted drafts when pruned', () => {
		const submitted = StatementDrafts.NONE.opened().submitted(1);

		expect(submitted.open).toBeUndefined();
		expect(submitted.opened().open?.id).toBe(2);
		expect(submitted.opened().pruneSubmitted().all).toEqual([{ id: 2, submitted: false }]);
		expect(StatementDrafts.NONE.opened().pruneSubmitted().all).toHaveLength(1);
	});

	it('returns itself when pruning drops nothing', () => {
		const drafts = StatementDrafts.NONE.opened();

		expect(drafts.pruneSubmitted()).toBe(drafts);
	});
});
