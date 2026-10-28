import { describe, expect, it } from 'vitest';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { getHeadword } from './headword';

describe('getHeadword', () => {
	it('takes the stated label, else the local name of the IRI in words', () => {
		expect(getHeadword(createResourceSummary('Tree', { label: 'Tree' }))).toBe('Tree');
		expect(getHeadword(createResourceSummary('AppleTree', { label: 'ex:AppleTree', hasLabel: false }))).toBe('Apple Tree');
		expect(getHeadword({ label: 'node', hasLabel: false, term: { kind: 'bnode', id: 'b1' } })).toBe('node');
	});
});
