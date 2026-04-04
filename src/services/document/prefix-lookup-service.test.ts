import { describe, it, expect } from 'vitest';
import { PrefixLookupService } from './prefix-lookup-service';
import { DEFAULT_PREFIXES } from './prefix-downloader-service';
import { IDocumentContextService } from './document-context-service.interface';

function createMockContextService(contexts: Record<string, { namespaces: Record<string, string> }> = {}): IDocumentContextService {
	return { contexts } as any;
}

function createMockExtensionContext(globalStateValues: Record<string, any> = {}): any {
	return {
		globalState: {
			get: (key: string, defaultValue?: any) => globalStateValues[key] ?? defaultValue,
		},
	};
}

describe('PrefixLookupService', () => {
	describe('getInferencePrefixes', () => {
		it('returns the standard W3C inference prefixes', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			const prefixes = service.getInferencePrefixes();

			expect(prefixes['rdf']).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
			expect(prefixes['rdfs']).toBe('http://www.w3.org/2000/01/rdf-schema#');
			expect(prefixes['owl']).toBe('http://www.w3.org/2002/07/owl#');
			expect(prefixes['skos']).toBe('http://www.w3.org/2004/02/skos/core#');
			expect(prefixes['shacl']).toBe('http://www.w3.org/ns/shacl#');
		});
	});

	describe('getDefaultPrefixes', () => {
		it('returns the stored value from globalState when present', () => {
			const stored = { lastUpdated: new Date(), prefixes: { ex: 'http://example.org/' } };
			const service = new PrefixLookupService(
				createMockExtensionContext({ defaultPrefixes: stored }),
				createMockContextService(),
			);

			expect(service.getDefaultPrefixes()).toEqual(stored.prefixes);
		});

		it('returns DEFAULT_PREFIXES when globalState has no stored value', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			expect(service.getDefaultPrefixes()).toBe(DEFAULT_PREFIXES.prefixes);
		});
	});

	describe('getPrefixForIri', () => {
		it('returns the prefix from the document context (highest priority)', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService({
					'file:///doc.ttl': { namespaces: { ex: 'http://example.org/' } },
				}),
			);

			expect(service.getPrefixForIri('file:///doc.ttl', 'http://example.org/', 'fallback')).toBe('ex');
		});

		it('allows empty prefix from the document context', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService({
					'file:///doc.ttl': { namespaces: { '': 'http://local.org/' } },
				}),
			);

			expect(service.getPrefixForIri('file:///doc.ttl', 'http://local.org/', 'fallback')).toBe('');
		});

		it('falls through to other workspace document namespaces when not in the target document', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService({
					'file:///other.ttl': { namespaces: { schema: 'http://schema.org/' } },
				}),
			);

			// target document 'file:///doc.ttl' is not in contexts
			expect(service.getPrefixForIri('file:///doc.ttl', 'http://schema.org/', 'fallback')).toBe('schema');
		});

		it('skips empty prefix from other workspace documents and falls through', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService({
					'file:///other.ttl': { namespaces: { '': 'http://schema.org/' } },
				}),
			);

			// Empty prefix from other docs is rejected, falls through to default
			const result = service.getPrefixForIri('file:///doc.ttl', 'http://schema.org/', 'fallback');

			expect(result).toBe('fallback');
		});

		it('falls through to the default prefix list', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			// 'rdf' is in DEFAULT_PREFIXES
			const rdfIri = DEFAULT_PREFIXES.prefixes['rdf'];
			expect(rdfIri).toBeDefined();

			const result = service.getPrefixForIri('file:///doc.ttl', rdfIri, 'fallback');

			expect(result).toBe('rdf');
		});

		it('returns defaultValue when IRI is not found anywhere', () => {
			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			expect(service.getPrefixForIri('file:///doc.ttl', 'http://totally-unknown.org/', 'unknown')).toBe('unknown');
		});
	});
});
