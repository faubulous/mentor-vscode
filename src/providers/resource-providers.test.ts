import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockContexts: Record<string, any>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => ({
			get contexts() { return mockContexts; },
		})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { ResourceDefinitionProvider } from './resource-definition-provider';
import { ResourceTooltipProvider } from './resource-tooltip-provider';
import { ResourceReferenceProvider } from './resource-reference-provider';

function makeRange(line = 0, char = 0) {
	return { start: { line, character: char }, end: { line, character: char + 5 } };
}

function makeCtx(overrides: any = {}) {
	return {
		uri: { toString: () => 'file:///test.ttl', scheme: 'file', path: '/test.ttl' } as any,
		isTemporary: false,
		typeDefinitions: {} as Record<string, any[]>,
		typeAssertions: {} as Record<string, any[]>,
		namespaceDefinitions: {} as Record<string, any[]>,
		references: {} as Record<string, any[]>,
		getIriAtPosition: vi.fn(() => undefined),
		getLiteralAtPosition: vi.fn(() => undefined),
		getResourceTooltip: vi.fn(() => new (vscode.MarkdownString as any)('tooltip')),
		...overrides,
	};
}

function makeDocument(uri = 'file:///test.ttl') {
	return {
		uri: { toString: () => uri, scheme: 'file' } as any,
		getText: () => '',
	} as any;
}

beforeEach(() => {
	mockContexts = {};
});

// ---- ResourceDefinitionProvider ----

describe('ResourceDefinitionProvider', () => {
	describe('provideDefinition', () => {
		it('should return null when context is not found', () => {
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinition(makeDocument('file:///unknown.ttl'), new (vscode.Position as any)(0, 0));
			expect(result).toBeNull();
		});

		it('should return null when no IRI at position', () => {
			const ctx = makeCtx({ getIriAtPosition: vi.fn(() => undefined) });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinition(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(result).toBeNull();
		});

		it('should return a Location when IRI is found at position and has a reference', () => {
			const range = makeRange(5, 3);
			const ctx = makeCtx({
				getIriAtPosition: vi.fn(() => 'urn:ex#Thing'),
				references: { 'urn:ex#Thing': [range] },
			});
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinition(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(result).toBeInstanceOf(vscode.Location);
		});
	});

	describe('provideDefinitionForResource', () => {
		it('should return null when no definition or reference exists', () => {
			const ctx = makeCtx();
			const provider = new ResourceDefinitionProvider();
			expect(provider.provideDefinitionForResource(ctx, 'urn:ex#Unknown')).toBeNull();
		});

		it('should return Location from typeDefinitions', () => {
			const range = makeRange(10, 0);
			const ctx = makeCtx({ typeDefinitions: { 'urn:ex#Cls': [range] } });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinitionForResource(ctx, 'urn:ex#Cls', true);
			expect(result).toBeInstanceOf(vscode.Location);
		});

		it('should return Location from typeAssertions when no typeDefinition', () => {
			const range = makeRange(3, 2);
			const ctx = makeCtx({ typeAssertions: { 'urn:ex#Ind': [range] } });
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinitionForResource(ctx, 'urn:ex#Ind', true);
			expect(result).toBeInstanceOf(vscode.Location);
		});

		it('should return Location from namespaceDefinitions', () => {
			const range = makeRange(0, 0);
			const ctx = makeCtx({ namespaceDefinitions: { 'urn:ex#': [range] } });
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinitionForResource(ctx, 'urn:ex#', true);
			expect(result).toBeInstanceOf(vscode.Location);
		});

		it('should return Location from references', () => {
			const range = makeRange(7, 4);
			const ctx = makeCtx({ references: { 'urn:ex#ref': [range] } });
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinitionForResource(ctx, 'urn:ex#ref', true);
			expect(result).toBeInstanceOf(vscode.Location);
		});

		it('should prefer context with typeDefinition from other documents', () => {
			const range = makeRange(1, 0);
			const ctxPrimary = makeCtx();
			const ctxOther = makeCtx({
				uri: { toString: () => 'file:///other.ttl', scheme: 'file', path: '/other.ttl' } as any,
				typeDefinitions: { 'urn:ex#X': [range] },
			});
			mockContexts['file:///test.ttl'] = ctxPrimary;
			mockContexts['file:///other.ttl'] = ctxOther;
			const provider = new ResourceDefinitionProvider();
			const result = provider.provideDefinitionForResource(ctxPrimary, 'urn:ex#X');
			expect(result).toBeInstanceOf(vscode.Location);
		});
	});
});

// ---- ResourceTooltipProvider ----

describe('ResourceTooltipProvider', () => {
	describe('provideHover', () => {
		it('should return null when context is not found', () => {
			const provider = new ResourceTooltipProvider();
			const result = provider.provideHover(makeDocument('file:///unknown.ttl'), new (vscode.Position as any)(0, 0));
			expect(result).toBeNull();
		});

		it('should return null when no IRI and no literal at position', () => {
			const ctx = makeCtx({ getIriAtPosition: vi.fn(() => undefined), getLiteralAtPosition: vi.fn(() => undefined) });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceTooltipProvider();
			const result = provider.provideHover(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(result).toBeNull();
		});

		it('should return Hover with tooltip when IRI is at position', () => {
			const ctx = makeCtx({ getIriAtPosition: vi.fn(() => 'urn:ex#Thing') });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceTooltipProvider();
			const result = provider.provideHover(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(result).toBeInstanceOf(vscode.Hover);
		});

		it('should return Hover with literal when literal is at position', () => {
			const ctx = makeCtx({
				getIriAtPosition: vi.fn(() => undefined),
				getLiteralAtPosition: vi.fn(() => 'some literal'),
			});
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceTooltipProvider();
			const result = provider.provideHover(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(result).toBeInstanceOf(vscode.Hover);
		});
	});
});

// ---- ResourceReferenceProvider ----

describe('ResourceReferenceProvider', () => {
	describe('provideReferences', () => {
		it('should return null when context is not found', () => {
			const provider = new ResourceReferenceProvider();
			const result = provider.provideReferences(makeDocument('file:///unknown.ttl'), new (vscode.Position as any)(0, 0));
			expect(result).toBeNull();
		});

		it('should return null when no IRI at position', () => {
			const ctx = makeCtx({ getIriAtPosition: vi.fn(() => undefined) });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceReferenceProvider();
			const result = provider.provideReferences(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(result).toBeNull();
		});

		it('should return locations list when IRI at position has references', () => {
			const range = makeRange(2, 1);
			const ctx = makeCtx({
				getIriAtPosition: vi.fn(() => 'urn:ex#Ref'),
				references: { 'urn:ex#Ref': [range] },
			});
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceReferenceProvider();
			const result = provider.provideReferences(makeDocument(), new (vscode.Position as any)(0, 0));
			expect(Array.isArray(result)).toBe(true);
			expect((result as vscode.Location[]).length).toBeGreaterThan(0);
		});
	});

	describe('provideReferencesForIri', () => {
		it('should return empty array when no contexts have references', () => {
			const ctx = makeCtx({ references: {} });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceReferenceProvider();
			expect(provider.provideReferencesForIri('urn:ex#X')).toEqual([]);
		});

		it('should skip temporary contexts', () => {
			const ctx = makeCtx({ isTemporary: true, references: { 'urn:ex#X': [makeRange()] } });
			mockContexts['file:///test.ttl'] = ctx;
			const provider = new ResourceReferenceProvider();
			expect(provider.provideReferencesForIri('urn:ex#X')).toEqual([]);
		});

		it('should return references from multiple contexts', () => {
			const ctx1 = makeCtx({ references: { 'urn:ex#X': [makeRange(0, 0)] } });
			const ctx2 = makeCtx({
				uri: { toString: () => 'file:///other.ttl', scheme: 'file', path: '/other.ttl' } as any,
				references: { 'urn:ex#X': [makeRange(5, 2)] },
			});
			mockContexts['file:///test.ttl'] = ctx1;
			mockContexts['file:///other.ttl'] = ctx2;
			const provider = new ResourceReferenceProvider();
			const result = provider.provideReferencesForIri('urn:ex#X');
			expect(result.length).toBe(2);
		});
	});
});
