import { describe, expect, it } from 'vitest';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getIriResourceId, getResourceId } from './resource-id';

describe('getResourceId', () => {
	it('names an IRI by the IRI and a blank node by the identifier of the parser', () => {
		expect(getResourceId(RdfDataFactory.namedNode('http://example.org/a'))).toBe(getIriResourceId('http://example.org/a'));
		expect(getResourceId(RdfDataFactory.blankNode('b0'))).toBe('b:b0');
	});
});
