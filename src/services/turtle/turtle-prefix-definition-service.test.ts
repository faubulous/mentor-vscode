import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { TurtlePrefixDefinitionService } from './turtle-prefix-definition-service';

// Mock all problematic modules BEFORE importing the service
vi.mock('@src/languages', () => ({
	TurtleDocument: class MockTurtleDocument {
		uri: any;
		namespaces: Record<string, string>;
	}
}));

vi.mock('@src/languages/turtle/turtle-feature-provider', () => ({
	TurtleFeatureProvider: class MockTurtleFeatureProvider {}
}));

vi.mock('@src/services/document/document-context-service', () => ({
	DocumentContextService: class MockDocumentContextService {
		getDocumentContext = vi.fn();
		contexts = {};
	}
}));

vi.mock('@src/services/document/prefix-lookup-service', () => ({
	PrefixLookupService: class MockPrefixLookupService {
		getPrefixForIri = vi.fn();
		getUriForPrefix = vi.fn();
	}
}));

vi.mock('@src/utilities', () => ({
	getIriFromIriReference: vi.fn()
}));

vi.mock('@src/utilities/config', () => ({
	getConfig: vi.fn(() => ({
		get: vi.fn()
	}))
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	Uri: {
		getNamespaceIri: vi.fn((iri: string) => iri)
	}
}));

vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfToken: {
		PREFIX: { name: 'PREFIX' },
		TTL_PREFIX: { name: 'TTL_PREFIX' },
		BASE: { name: 'BASE' },
		TTL_BASE: { name: 'TTL_BASE' },
		IRIREF: { name: 'IRIREF' }
	},
	isUpperCaseToken: vi.fn(),
	getFirstTokenOfType: vi.fn(),
	getLastTokenOfType: vi.fn()
}));

// Type definition for the mock context
interface MockContext {
	uri: vscode.Uri;
	namespaces: Record<string, string>;
}

/**
 * Create a minimal mock context that satisfies the TurtleDocument interface
 * for the getUniquePrefixForIri method.
 */
function createMockContext(documentUri: string, namespaces: Record<string, string> = {}): MockContext {
	return {
		uri: vscode.Uri.parse(documentUri),
		namespaces: { ...namespaces },
	};
}

/**
 * Create a mock PrefixLookupService.
 */
function createMockPrefixLookupService(getPrefixForIriImpl?: (documentUri: string, namespaceIri: string, defaultValue: string) => string) {
	return {
		getPrefixForIri: vi.fn(getPrefixForIriImpl ?? ((_, __, defaultValue) => defaultValue)),
		getUriForPrefix: vi.fn(() => ''),
		getDefaultPrefixes: vi.fn(() => ({})),
		getInferencePrefixes: vi.fn(() => ({})),
	};
}

/**
 * Create a mock DocumentContextService.
 */
function createMockDocumentContextService() {
	return {
		getDocumentContext: vi.fn(),
		contexts: {},
	};
}

describe('TurtlePrefixDefinitionService', () => {
	describe('getUniquePrefixForIri', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;
		let mockPrefixLookupService: any;

		beforeEach(() => {
			mockContextService = createMockDocumentContextService();
			mockPrefixLookupService = createMockPrefixLookupService();
			service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);
		});

		describe('when prefix is defined in local document for the exact same IRI', () => {
			it('should reuse the existing prefix', () => {
				const context = createMockContext('file:///test.ttl', {
					'owl': 'http://www.w3.org/2002/07/owl#'
				});

				const prefix = service.getUniquePrefixForIri(context, 'http://www.w3.org/2002/07/owl#', 'ns');

				expect(prefix).toBe('owl');
			});

			it('should reuse the empty prefix if same IRI', () => {
				const context = createMockContext('file:///test.ttl', {
					'': 'http://example.org#'
				});

				const prefix = service.getUniquePrefixForIri(context, 'http://example.org#', 'ns');

				expect(prefix).toBe('');
			});
		});

		describe('when prefix from another document is available', () => {
			it('should reuse non-empty prefix from another document', () => {
				const context = createMockContext('file:///test.ttl', {});

				mockPrefixLookupService = createMockPrefixLookupService(
					(_, namespaceIri, defaultValue) => {
						if (namespaceIri === 'http://www.w3.org/2002/07/owl#') {
							return 'owl';
						}
						return defaultValue;
					}
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://www.w3.org/2002/07/owl#', 'ns');

				expect(prefix).toBe('owl');
			});

			it('should use empty prefix from another document if current document has no empty prefix', () => {
				const context = createMockContext('file:///test.ttl', {
					'owl': 'http://www.w3.org/2002/07/owl#'
				});

				// Simulate getPrefixForIri returning empty prefix from another document
				mockPrefixLookupService = createMockPrefixLookupService(
					(_, namespaceIri, defaultValue) => {
						if (namespaceIri === 'http://example.org#') {
							return ''; // Empty prefix found in another document
						}
						return defaultValue;
					}
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://example.org#', 'ns');

				expect(prefix).toBe('');
			});

			it('should NOT use empty prefix from another document if current document already has an empty prefix', () => {
				const context = createMockContext('file:///test.ttl', {
					'': 'http://local.example#' // Current doc has empty prefix for different IRI
				});

				mockPrefixLookupService = createMockPrefixLookupService(
					(_, namespaceIri, defaultValue) => {
						if (namespaceIri === 'http://other.example#') {
							return ''; // Empty prefix found in another document
						}
						return defaultValue;
					}
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://other.example#', 'ns');

				// Should fall back to default since we can't use empty prefix
				expect(prefix).toBe('ns');
			});
		});

		describe('when no prefix is found anywhere', () => {
			it('should use the default value', () => {
				const context = createMockContext('file:///test.ttl', {});

				const prefix = service.getUniquePrefixForIri(context, 'http://unknown.example#', 'custom');

				expect(prefix).toBe('custom');
			});
		});

		describe('prefix disambiguation with numbers', () => {
			it('should append number when prefix conflicts with different IRI', () => {
				const context = createMockContext('file:///test.ttl', {
					'ex': 'http://existing.example#'
				});

				mockPrefixLookupService = createMockPrefixLookupService(
					(_, namespaceIri, defaultValue) => {
						if (namespaceIri === 'http://new.example#') {
							return 'ex'; // Lookup returns 'ex' but it's already used for different IRI
						}
						return defaultValue;
					}
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://new.example#', 'ns');

				expect(prefix).toBe('ex1');
			});

			it('should increment number until unique', () => {
				const context = createMockContext('file:///test.ttl', {
					'ex': 'http://existing1.example#',
					'ex1': 'http://existing2.example#',
					'ex2': 'http://existing3.example#'
				});

				mockPrefixLookupService = createMockPrefixLookupService(
					(_, namespaceIri, defaultValue) => {
						if (namespaceIri === 'http://new.example#') {
							return 'ex';
						}
						return defaultValue;
					}
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://new.example#', 'ns');

				expect(prefix).toBe('ex3');
			});

			it('should NOT append numbers to empty prefix - fall back to default instead', () => {
				const context = createMockContext('file:///test.ttl', {
					'': 'http://local.example#'
				});

				// getPrefixForIri won't return empty for different IRI from same doc
				// because step 1 already checks local doc. But if lookup returns empty
				// and local doc has empty for different IRI, we fall back to default.
				mockPrefixLookupService = createMockPrefixLookupService(
					(_, namespaceIri, defaultValue) => {
						// This simulates a scenario where the lookup returns empty
						// (e.g., from another document)
						if (namespaceIri === 'http://other.example#') {
							return '';
						}
						return defaultValue;
					}
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://other.example#', 'ns');

				// Should be 'ns', not '1' or '' with a number
				expect(prefix).toBe('ns');
			});

			it('should disambiguate default value if it conflicts', () => {
				const context = createMockContext('file:///test.ttl', {
					'ns': 'http://existing.example#'
				});

				// Lookup returns default value
				const prefix = service.getUniquePrefixForIri(context, 'http://new.example#', 'ns');

				expect(prefix).toBe('ns1');
			});
		});

		describe('edge cases', () => {
			it('should handle document with no namespaces', () => {
				const context = createMockContext('file:///test.ttl', {});

				const prefix = service.getUniquePrefixForIri(context, 'http://unknown.example#', 'ns');

				expect(prefix).toBe('ns');
			});

			it('should handle multiple prefixes for same IRI in local document (returns first match)', () => {
				// Note: This is technically invalid RDF but the code should handle it gracefully
				const context = createMockContext('file:///test.ttl', {
					'owl': 'http://www.w3.org/2002/07/owl#',
					'owl2': 'http://www.w3.org/2002/07/owl#'
				});

				const prefix = service.getUniquePrefixForIri(context, 'http://www.w3.org/2002/07/owl#', 'ns');

				// Should return one of the existing prefixes (first match in iteration)
				expect(['owl', 'owl2']).toContain(prefix);
			});

			it('should not modify existing prefix when IRI matches exactly', () => {
				const context = createMockContext('file:///test.ttl', {
					'ex': 'http://example.org#'
				});

				mockPrefixLookupService = createMockPrefixLookupService(
					() => 'ex' // Lookup also returns 'ex'
				);
				service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

				const prefix = service.getUniquePrefixForIri(context, 'http://example.org#', 'ns');

				// Should reuse 'ex' from local doc (found in step 1), not create 'ex1'
				expect(prefix).toBe('ex');
			});
		});
	});
});
