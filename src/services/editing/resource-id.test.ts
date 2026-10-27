import { describe, expect, it } from 'vitest';
import { getIriResourceId, getTermRefResourceId } from './resource-id';

describe('getTermRefResourceId', () => {
	it('names an IRI and a blank node as the host does, and a literal not at all', () => {
		expect(getTermRefResourceId({ kind: 'iri', iri: 'http://example.org/a' })).toBe(getIriResourceId('http://example.org/a'));
		expect(getTermRefResourceId({ kind: 'bnode', id: 'b0' })).toBe('b:b0');
		expect(getTermRefResourceId({ kind: 'literal', value: 'x' })).toBeUndefined();
	});
});
