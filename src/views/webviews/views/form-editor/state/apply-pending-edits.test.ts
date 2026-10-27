import { describe, expect, it } from 'vitest';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { applyPendingEdits } from './apply-pending-edits';
import { PendingEdit } from './pending-edits';

const EX = 'http://example.org/';
const subject = { kind: 'iri' as const, iri: `${EX}s` };

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
 * Wrap operations into a pending edit.
 */
function pending(operations: PendingEdit['operations']): PendingEdit {
	return { editId: 'e', cellKey: 'k', status: 'inFlight', operations };
}

/**
 * The prefixed names of the rows of a detail.
 */
function rowsOf(result: ResourceDetail): (string | undefined)[] {
	return result.properties.map(property => property.predicate.prefixedName);
}

describe('applyPendingEdits', () => {
	it('returns the detail itself when nothing is pending', () => {
		expect(applyPendingEdits(detail, [])).toBe(detail);
	});

	it('removes the row of a deleted predicate', () => {
		expect(rowsOf(applyPendingEdits(detail, [pending([{ op: 'deleteProperty', subject, predicate: `${EX}q` }])]))).toEqual(['ex:p', 'ex:r']);
	});

	it('moves the row of a predicate before another or to the end', () => {
		expect(rowsOf(applyPendingEdits(detail, [pending([{ op: 'moveProperty', subject, predicate: `${EX}r`, before: `${EX}p` }])]))).toEqual(['ex:r', 'ex:p', 'ex:q']);
		expect(rowsOf(applyPendingEdits(detail, [pending([{ op: 'moveProperty', subject, predicate: `${EX}p` }])]))).toEqual(['ex:q', 'ex:r', 'ex:p']);
	});

	it('applies the edits in order', () => {
		const result = applyPendingEdits(detail, [
			pending([{ op: 'moveProperty', subject, predicate: `${EX}r`, before: `${EX}p` }]),
			pending([{ op: 'deleteProperty', subject, predicate: `${EX}p` }])
		]);

		expect(rowsOf(result)).toEqual(['ex:r', 'ex:q']);
	});

	it('leaves the rows alone for a predicate the detail lacks and for a rewritten statement', () => {
		expect(applyPendingEdits(detail, [pending([{ op: 'deleteProperty', subject, predicate: `${EX}missing` }])])).toBe(detail);
		expect(applyPendingEdits(detail, [pending([{ op: 'moveProperty', subject, predicate: `${EX}p`, before: `${EX}missing` }])])).toBe(detail);
		expect(applyPendingEdits(detail, [pending([{ op: 'replaceStatement', subject, predicate: `${EX}p`, text: 'ex:p "z"' }])])).toBe(detail);
	});
});
