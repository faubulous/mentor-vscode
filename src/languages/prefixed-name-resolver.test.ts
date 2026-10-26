import { describe, it, expect } from 'vitest';
import { PrefixedNameResolver } from '@src/languages/prefixed-name-resolver';

describe('PrefixedNameResolver', () => {
	it('resolves a prefixed name to its IRI', () => {
		const resolver = new PrefixedNameResolver({ ex: 'http://example.org/' });

		expect(resolver.getIri('ex:Thing')).toBe('http://example.org/Thing');
		expect(resolver.getIri('owl:Class')).toBeUndefined();
	});

	it('removes a trailing slash or hash from the normalized IRI', () => {
		const resolver = new PrefixedNameResolver({ ex: 'http://example.org/ns#' });

		expect(resolver.getIri('ex:')).toBe('http://example.org/ns#');
		expect(resolver.getNormalizedIri('ex:')).toBe('http://example.org/ns');
		expect(resolver.getNormalizedIri('owl:Class')).toBeUndefined();
	});

	it('returns the same string for every occurrence of a name', () => {
		const resolver = new PrefixedNameResolver({ ex: 'http://example.org/' });
		const name = 'ex:Thing';

		// Two distinct strings with the same content, as two tokens of a document have.
		expect(resolver.getIri(name)).toBe(resolver.getIri(['ex', 'Thing'].join(':')));
	});

	it('resolves the names again with the current namespaces after clear', () => {
		const namespaces: Record<string, string> = { ex: 'http://example.org/a/' };
		const resolver = new PrefixedNameResolver(namespaces);

		expect(resolver.getNormalizedIri('ex:Thing')).toBe('http://example.org/a/Thing');

		namespaces['ex'] = 'http://example.org/b/';

		// Without clear, the name keeps its IRI, as the resolver caches it.
		expect(resolver.getNormalizedIri('ex:Thing')).toBe('http://example.org/a/Thing');

		resolver.clear();

		expect(resolver.getIri('ex:Thing')).toBe('http://example.org/b/Thing');
		expect(resolver.getNormalizedIri('ex:Thing')).toBe('http://example.org/b/Thing');
	});
});
