import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { getShapeGraphCandidates } from '@src/utilities/shacl';

/**
 * Builds a store double whose graphs all contain SHACL shapes.
 */
function createStore(graphs: string[]) {
	return {
		getGraphs: () => graphs,
		any: () => true,
	} as any;
}

describe('getShapeGraphCandidates', () => {
	it('returns sorted shape graph URIs and skips inference graphs', () => {
		const store = createStore([
			'workspace:///b.ttl',
			'http://www.w3.org/ns/shacl#',
			'workspace:///a.ttl',
			'workspace:///a.ttl?inference',
		]);

		expect(getShapeGraphCandidates(store)).toEqual([
			'http://www.w3.org/ns/shacl#',
			'workspace:///a.ttl',
			'workspace:///b.ttl',
		]);
	});
});
