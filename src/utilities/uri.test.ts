import { describe, it, expect } from 'vitest';
import { toJsonId, getIriFromNodeId, getLocalPartAndQuery, getFileName, getPath } from './uri';

describe('toJsonId', () => {
	it('converts http URI to dot-separated identifier', () => {
		expect(toJsonId('http://example.org/path/to/resource')).toBe('example.org.path.to.resource');
	});

	it('strips trailing dot', () => {
		expect(toJsonId('http://example.org/')).toBe('example.org');
	});

	it('returns undefined for URIs with no authority (no //)', () => {
		expect(toJsonId('urn:example:resource')).toBeUndefined();
	});

	it('returns the input unchanged when falsy', () => {
		expect(toJsonId('')).toBe('');
	});

	it('preserves dots in the domain', () => {
		// Trailing dot is stripped by the slice(0,-1) call
		expect(toJsonId('https://www.w3.org/2002/07/owl#')).toBe('www.w3.org.2002.07.owl');
	});

	it('replaces # and / with dots', () => {
		const result = toJsonId('http://www.w3.org/ns/shacl#');
		// Trailing dot stripped
		expect(result).toBe('www.w3.org.ns.shacl');
	});
});

describe('getIriFromNodeId', () => {
	it('extracts IRI from angle-bracket node ID', () => {
		expect(getIriFromNodeId('<http://example.org/Thing>')).toBe('http://example.org/Thing');
	});

	it('returns the string unchanged when no angle brackets are present', () => {
		expect(getIriFromNodeId('http://example.org/Thing')).toBe('http://example.org/Thing');
	});

	it('returns the string unchanged when < appears after >', () => {
		expect(getIriFromNodeId('>invalid<')).toBe('>invalid<');
	});

	it('handles an empty angle-bracket pair', () => {
		expect(getIriFromNodeId('<>')).toBe('');
	});

	it('extracts IRI when there are multiple angle brackets (uses last pair)', () => {
		// lastIndexOf('<') and lastIndexOf('>') — uses last occurrences
		expect(getIriFromNodeId('abc <http://example.org/Thing>')).toBe('http://example.org/Thing');
	});
});

describe('getLocalPartAndQuery', () => {
	it('returns the fragment part when the IRI contains #', () => {
		expect(getLocalPartAndQuery('http://example.org/ontology#Thing')).toBe('Thing');
	});

	it('returns the last path segment when there is no #', () => {
		expect(getLocalPartAndQuery('http://example.org/ontology/Thing')).toBe('Thing');
	});

	it('returns the IRI itself when there is no local part', () => {
		expect(getLocalPartAndQuery('Thing')).toBe('Thing');
	});

	it('returns the full IRI when split on # yields an empty last element (falls back to iri)', () => {
		// split('#').pop() returns '' which is falsy, so the || iri branch fires
		expect(getLocalPartAndQuery('http://example.org/ontology#')).toBe('http://example.org/ontology#');
	});

	it('returns the full IRI when split on / yields an empty last element', () => {
		// split('/').pop() returns '' which is falsy, so the || iri branch fires
		expect(getLocalPartAndQuery('http://example.org/ontology/')).toBe('http://example.org/ontology/');
	});
});

describe('getFileName', () => {
	it('returns the last path segment', () => {
		expect(getFileName('file:///workspace/models/thing.ttl')).toBe('thing.ttl');
	});

	it('returns the URI itself when there are no slashes', () => {
		expect(getFileName('thing.ttl')).toBe('thing.ttl');
	});

	it('returns empty string when URI ends with /', () => {
		expect(getFileName('file:///workspace/')).toBe('');
	});

	it('works with a plain filename', () => {
		expect(getFileName('data.rdf')).toBe('data.rdf');
	});
});

describe('getPath', () => {
	it('returns the directory part of a URI', () => {
		expect(getPath('file:///workspace/models/thing.ttl')).toBe('file:///workspace/models');
	});

	it('returns the URI itself when there are no slashes', () => {
		expect(getPath('thing.ttl')).toBe('thing.ttl');
	});

	it('strips only the last segment', () => {
		expect(getPath('http://example.org/a/b/c')).toBe('http://example.org/a/b');
	});
});
