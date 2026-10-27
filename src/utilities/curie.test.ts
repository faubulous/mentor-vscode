import { describe, expect, it } from 'vitest';
import { RDFS } from '@faubulous/mentor-rdf';
import { LINE_TEST_NAMESPACES } from './mocks/line-fixtures';
import { compressIri, expandCurie, iriOfTermText, localNameOf, splitCurie } from './curie';

describe('splitCurie', () => {
	it('splits a prefixed name', () => {
		expect(splitCurie('rdfs:label')).toEqual({ prefix: 'rdfs', local: 'label' });
		expect(splitCurie(':x')).toEqual({ prefix: '', local: 'x' });
		expect(splitCurie('ex:')).toEqual({ prefix: 'ex', local: '' });
	});

	it('rejects a bare word', () => {
		expect(splitCurie('label')).toBeUndefined();
	});
});

describe('expandCurie', () => {
	it('expands a declared prefix and leaves anything else alone', () => {
		expect(expandCurie('rdfs:label', LINE_TEST_NAMESPACES)).toBe(RDFS.label);
		expect(expandCurie('foo:x', LINE_TEST_NAMESPACES)).toBe('foo:x');
		expect(expandCurie('label', LINE_TEST_NAMESPACES)).toBe('label');
	});
});

describe('iriOfTermText', () => {
	it('resolves IRI references and declared prefixed names', () => {
		expect(iriOfTermText('<http://x/y>', LINE_TEST_NAMESPACES)).toBe('http://x/y');
		expect(iriOfTermText('rdfs:label', LINE_TEST_NAMESPACES)).toBe(RDFS.label);
		expect(iriOfTermText('foo:x', LINE_TEST_NAMESPACES)).toBeUndefined();
		expect(iriOfTermText('word', LINE_TEST_NAMESPACES)).toBeUndefined();
	});
});

describe('compressIri', () => {
	it('writes a prefixed name when a namespace covers the IRI', () => {
		expect(compressIri(RDFS.label, LINE_TEST_NAMESPACES)).toBe('rdfs:label');
	});

	it('writes an IRI reference otherwise', () => {
		expect(compressIri('http://other/x', LINE_TEST_NAMESPACES)).toBe('<http://other/x>');
		expect(compressIri('http://example.org/a/b', LINE_TEST_NAMESPACES)).toBe('<http://example.org/a/b>');
	});

	it('prefers the longest namespace', () => {
		expect(compressIri('http://x/y/z', { a: 'http://x/', b: 'http://x/y/' })).toBe('b:z');
	});
});

describe('localNameOf', () => {
	it('takes the fragment or the last path segment', () => {
		expect(localNameOf('http://x/y#z')).toBe('z');
		expect(localNameOf('http://x/y/z')).toBe('z');
		expect(localNameOf('abc')).toBe('abc');
	});
});
