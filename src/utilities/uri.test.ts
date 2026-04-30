import { describe, it, expect } from 'vitest';
import { toJsonId, getIriFromNodeId, getLocalPartAndQuery, toDisplayPath, getFileName, getPath } from '@src/utilities/uri';

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

describe('toDisplayPath', () => {
	it('strips workspace:/// scheme and decodes percent-encoded characters', () => {
		expect(toDisplayPath('workspace:///my%20shapes/file.ttl')).toBe('my shapes/file.ttl');
	});

	it('strips file:/// scheme and decodes percent-encoded characters', () => {
		expect(toDisplayPath('file:///home/user/my%20project/query.sparql')).toBe('home/user/my project/query.sparql');
	});

	it('returns a plain path unchanged (no scheme, no encoding)', () => {
		expect(toDisplayPath('models/thing.ttl')).toBe('models/thing.ttl');
	});

	it('does not strip two-slash scheme (http://)', () => {
		expect(toDisplayPath('http://example.org/path')).toBe('http://example.org/path');
	});

	it('decodes multiple encoded segments', () => {
		expect(toDisplayPath('workspace:///my%20folder/sub%20dir/file.ttl')).toBe('my folder/sub dir/file.ttl');
	});

	it('is a no-op for an already-decoded native path', () => {
		expect(toDisplayPath('/home/user/my project/file.ttl')).toBe('/home/user/my project/file.ttl');
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

	it('decodes percent-encoded filename from workspace URI', () => {
		expect(getFileName('workspace:///shapes/my%20shapes.ttl')).toBe('my shapes.ttl');
	});

	it('decodes percent-encoded filename from file URI', () => {
		expect(getFileName('file:///home/user/my%20project/query.sparql')).toBe('query.sparql');
	});
});

describe('getPath', () => {
	it('returns the directory part of a URI without scheme prefix', () => {
		expect(getPath('file:///workspace/models/thing.ttl')).toBe('workspace/models');
	});

	it('returns the URI itself when there are no slashes', () => {
		expect(getPath('thing.ttl')).toBe('thing.ttl');
	});

	it('strips only the last segment', () => {
		expect(getPath('http://example.org/a/b/c')).toBe('http://example.org/a/b');
	});

	it('decodes percent-encoded path from workspace URI', () => {
		expect(getPath('workspace:///my%20shapes/sub%20dir/file.ttl')).toBe('my shapes/sub dir');
	});

	it('leaves an already-decoded native path unchanged', () => {
		expect(getPath('/home/user/my project/models/thing.ttl')).toBe('/home/user/my project/models');
	});
});
