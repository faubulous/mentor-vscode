import { describe, expect, it } from 'vitest';
import { RDFS } from '@faubulous/mentor-rdf';
import { TEST_NAMESPACES } from './mocks/statement-fixtures';
import {
	getIriFromPrefixedName,
	getIriFromText,
	getNamespaceIriFromPrefixedName,
	getPrefixedName,
	splitPrefixedName
} from './prefixed-name';

describe('splitPrefixedName', () => {
	it('splits a prefixed name at its first colon', () => {
		expect(splitPrefixedName('rdfs:label')).toEqual({ prefix: 'rdfs', localName: 'label' });
		expect(splitPrefixedName(':x')).toEqual({ prefix: '', localName: 'x' });
		expect(splitPrefixedName('ex:')).toEqual({ prefix: 'ex', localName: '' });
		expect(splitPrefixedName('ex:a:b')).toEqual({ prefix: 'ex', localName: 'a:b' });
	});

	it('rejects a bare word', () => {
		expect(splitPrefixedName('label')).toBeUndefined();
	});
});

describe('getIriFromPrefixedName', () => {
	const prefixes = { ex: 'http://example.org/' };

	it('expands a prefixed name to a full IRI', () => {
		expect(getIriFromPrefixedName(prefixes, 'ex:Thing')).toBe('http://example.org/Thing');
	});

	it('returns undefined for an unknown prefix', () => {
		expect(getIriFromPrefixedName(prefixes, 'owl:Class')).toBeUndefined();
	});

	it('expands a prefix with an empty local name', () => {
		const pfx = { ex: 'http://example.org/' };
		expect(getIriFromPrefixedName(pfx, 'ex:')).toBe('http://example.org/');
	});

	it('returns undefined for a string without a colon', () => {
		expect(getIriFromPrefixedName(prefixes, 'noColon')).toBeUndefined();
	});

	it('ends the prefix at the first colon, as local names may contain colons', () => {
		expect(getIriFromPrefixedName(prefixes, 'ex:a:b')).toBe('http://example.org/a:b');
		expect(getIriFromPrefixedName(prefixes, 'ex:a:')).toBe('http://example.org/a:');
	});

	it('resolves the reserved character escapes of the local name', () => {
		expect(getIriFromPrefixedName(prefixes, 'ex:a\\-b')).toBe('http://example.org/a-b');
		expect(getIriFromPrefixedName(prefixes, "ex:\\_\\~\\.\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=\\/\\?\\#\\@\\%")).toBe("http://example.org/_~.!$&'()*+,;=/?#@%");
	});

	it('keeps the percent-encodings of the local name', () => {
		expect(getIriFromPrefixedName(prefixes, 'ex:a%20b')).toBe('http://example.org/a%20b');
	});

	it('expands a name with the empty prefix', () => {
		expect(getIriFromPrefixedName({ '': 'http://default.org/' }, ':Thing')).toBe('http://default.org/Thing');
	});
});

describe('getNamespaceIriFromPrefixedName', () => {
	const prefixes = { ex: 'http://example.org/', '': 'http://default.org/' };

	it('returns the namespace IRI for a known prefix', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, 'ex:Thing')).toBe('http://example.org/');
	});

	it('returns the namespace IRI of a name whose local name contains colons', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, 'ex:a:b')).toBe('http://example.org/');
	});

	it('returns the namespace IRI for the empty prefix', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, ':local')).toBe('http://default.org/');
	});

	it('returns undefined for an unknown prefix', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, 'owl:Class')).toBeUndefined();
	});
});

describe('getPrefixedName', () => {
	it('writes a prefixed name when a namespace covers the IRI', () => {
		expect(getPrefixedName(TEST_NAMESPACES, RDFS.label)).toBe('rdfs:label');
	});

	it('knows no name for an IRI outside the namespaces or with a local name that needs escapes', () => {
		expect(getPrefixedName(TEST_NAMESPACES, 'http://other/x')).toBeUndefined();
		expect(getPrefixedName(TEST_NAMESPACES, 'http://example.org/a/b')).toBeUndefined();
	});

	it('prefers the longest namespace', () => {
		expect(getPrefixedName({ a: 'http://x/', b: 'http://x/y/' }, 'http://x/y/z')).toBe('b:z');
	});
});

describe('getIriFromText', () => {
	it('resolves IRI references and declared prefixed names', () => {
		expect(getIriFromText(TEST_NAMESPACES, '<http://x/y>')).toBe('http://x/y');
		expect(getIriFromText(TEST_NAMESPACES, 'rdfs:label')).toBe(RDFS.label);
		expect(getIriFromText(TEST_NAMESPACES, 'foo:x')).toBeUndefined();
		expect(getIriFromText(TEST_NAMESPACES, 'word')).toBeUndefined();
	});
});
