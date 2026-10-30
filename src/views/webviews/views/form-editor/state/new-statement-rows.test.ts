import { describe, expect, it } from 'vitest';
import { NewStatementRows } from './new-statement-rows';
import { StatementDraft } from './statement-draft';

const statement = new StatementDraft('http://example.org/p', [{ kind: 'term', term: { kind: 'literal', value: 'x' } }]);

describe('NewStatementRows', () => {
	it('opens rows with rising identifiers and keeps the last one open', () => {
		const rows = NewStatementRows.NONE.opened().opened();

		expect(rows.all.map(row => row.id)).toEqual([1, 2]);
		expect(rows.open?.id).toBe(2);
		expect(NewStatementRows.NONE.open).toBeUndefined();
	});

	it('closes the open row once its statement is handed over and drops such rows when pruned', () => {
		const submitted = NewStatementRows.NONE.opened().submitted(1, statement);

		expect(submitted.open).toBeUndefined();
		expect(submitted.all[0].submitted).toBe(statement);
		expect(submitted.opened().open?.id).toBe(2);
		expect(submitted.opened().pruneSubmitted().all).toEqual([{ id: 2 }]);
	});

	it('returns itself when pruning drops nothing', () => {
		const rows = NewStatementRows.NONE.opened();

		expect(rows.pruneSubmitted()).toBe(rows);
	});
});
