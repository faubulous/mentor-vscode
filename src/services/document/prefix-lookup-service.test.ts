import { describe, it, expect, vi } from 'vitest';
import { PrefixLookupService } from '@src/services/document/prefix-lookup-service';
import { DEFAULT_PREFIXES } from '@src/services/document/prefix-downloader-service';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(() => ({ get: vi.fn(() => undefined) }))
}));

vi.mock('@src/providers/workspace-uri', () => ({
	WorkspaceUri: {
		supportedSchemes: new Set(['file', 'vscode-notebook-cell', 'vscode-vfs']),
		toWorkspaceUri: vi.fn(() => undefined),
	}
}));

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
		it('returns the prefix from the document context (highest priority)', () => {			const service = new PrefixLookupService(
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

		it('returns prefix from project configuration namespaces', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string) => {
					if (key === 'namespaces') {
						return [{ defaultPrefix: 'proj', uri: 'http://project.example/' }];
					}
					return undefined;
				})
			});

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			expect(service.getPrefixForIri('file:///doc.ttl', 'http://project.example/', 'fallback')).toBe('proj');
		});
	});

	describe('getUriForPrefix', () => {
		it('returns IRI + # for non-fragment file URI with empty prefix', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			// 'file' is a supported scheme but toWorkspaceUri returns undefined → falls back to original uri
			const result = service.getUriForPrefix('file:///workspace/test.ttl', '');

			// URI does not contain '#', so result is uri + '#'
			expect(result).toBe('file:///workspace/test.ttl#');
		});

		it('returns prefix URI from project config when configured', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string) => {
					if (key === 'namespaces') {
						return [{ defaultPrefix: 'ex', uri: 'http://example.org/' }];
					}
					return undefined;
				})
			});

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			expect(service.getUriForPrefix('file:///doc.ttl', 'ex')).toBe('http://example.org/');
		});

		it('returns most frequently used URI from workspace documents', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService({
					'file:///a.ttl': { namespaces: { ex: 'http://example.org/' } },
					'file:///b.ttl': { namespaces: { ex: 'http://example.org/' } },
					'file:///c.ttl': { namespaces: { ex: 'http://other.org/' } },
				}),
			);

			// 'http://example.org/' appears twice, 'http://other.org/' only once
			expect(service.getUriForPrefix('file:///doc.ttl', 'ex')).toBe('http://example.org/');
		});

		it('falls through to default prefixes when not in workspace docs', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			// 'rdf' is in DEFAULT_PREFIXES
			const rdfIri = DEFAULT_PREFIXES.prefixes['rdf'];
			expect(rdfIri).toBeDefined();
			expect(service.getUriForPrefix('file:///doc.ttl', 'rdf')).toBe(rdfIri);
		});

		it('returns empty string for unknown prefix', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			expect(service.getUriForPrefix('file:///doc.ttl', 'completelyunknown')).toBe('');
		});

		it('uses the workspace-relative URI when toWorkspaceUri returns a value (line 118)', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			const { WorkspaceUri } = await import('@src/providers/workspace-uri');
			(WorkspaceUri.toWorkspaceUri as any).mockReturnValueOnce({ toString: () => 'workspace:/test.ttl' });

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			// WorkspaceUri.toWorkspaceUri returned 'workspace:/test.ttl' which doesn't end with '#'
			const result = service.getUriForPrefix('file:///w/test.ttl', '');

			expect(result).toBe('workspace:/test.ttl#');
		});

		it('returns uri + query param when URI contains a fragment (#)', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockImplementation((key: string) => {
					if (key === 'prefixes.queryParameterName') return 'named';
					return undefined;
				})
			});

			const { WorkspaceUri } = await import('@src/providers/workspace-uri');
			(WorkspaceUri.toWorkspaceUri as any).mockReturnValue(undefined);

			const service = new PrefixLookupService(
				createMockExtensionContext(),
				createMockContextService(),
			);

			// URI that contains '#' → uses query param
			const result = service.getUriForPrefix('http://not-a-file-scheme/doc#cell1', '');

			expect(result).toContain('?named=');
		});
	});
});
