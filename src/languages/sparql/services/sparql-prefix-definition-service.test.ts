import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@src/languages', () => ({
	TurtleDocument: class MockTurtleDocument {}
}));

vi.mock('@src/languages/turtle/turtle-feature-provider', () => ({
	TurtleFeatureProvider: class MockTurtleFeatureProvider {}
}));

vi.mock('@src/services/document/document-context-service', () => ({
	DocumentContextService: class MockDocumentContextService {}
}));

vi.mock('@src/services/document/prefix-lookup-service', () => ({
	PrefixLookupService: class MockPrefixLookupService {}
}));

vi.mock('@src/utilities', () => ({
	getIriFromIriReference: vi.fn(),
	getContentStartOffset: () => 0,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(() => ({ get: vi.fn() }))
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	Uri: { getNamespaceIri: vi.fn((iri: string) => iri) }
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

import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { SparqlPrefixDefinitionService } from '@src/languages/sparql/services/sparql-prefix-definition-service';

function makeService(): any {
	return new SparqlPrefixDefinitionService({} as any, {} as any);
}

describe('SparqlPrefixDefinitionService', () => {
	it('always uses the PREFIX token type (never @prefix)', () => {
		const service = makeService();

		expect(service.getPrefixTokenType({} as any, {} as any)).toBe(RdfToken.PREFIX);
	});

	it('emits a SPARQL PREFIX declaration without a trailing dot', () => {
		const service = makeService();

		const def = service.getPrefixDefinition(RdfToken.PREFIX, true, 'foaf', 'http://xmlns.com/foaf/0.1/');

		expect(def).toBe('PREFIX foaf: <http://xmlns.com/foaf/0.1/>');
		expect(def).not.toContain('@prefix');
		expect(def.trimEnd().endsWith('.')).toBe(false);
	});

	it('emits a lowercase prefix keyword when upperCase is false', () => {
		const service = makeService();

		const def = service.getPrefixDefinition(RdfToken.PREFIX, false, 'ex', 'http://example.org/');

		expect(def).toBe('prefix ex: <http://example.org/>');
	});
});
