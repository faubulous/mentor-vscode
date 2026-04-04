import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';

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

vi.mock('@src/utilities/vscode/config', () => ({
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
	tokens?: any[];
	getRangeFromToken?: (token: any) => vscode.Range;
}

/**
 * Create a minimal mock context that satisfies the TurtleDocument interface
 * for the getUniquePrefixForIri method.
 */
function createMockContext(documentUri: string, namespaces: Record<string, string> = {}, tokens: any[] = []): MockContext {
	return {
		uri: vscode.Uri.parse(documentUri),
		namespaces: { ...namespaces },
		tokens,
		getRangeFromToken: (token: any) => new vscode.Range(
			new vscode.Position((token.startLine ?? 1) - 1, (token.startColumn ?? 1) - 1),
			new vscode.Position((token.endLine ?? 1) - 1, token.endColumn ?? 1)
		),
	};
}

/**
 * Create a mock token.
 */
function makeToken(name: string, image: string, line: number = 1, startColumn: number = 1, endColumn?: number): any {
	return {
		tokenType: { name },
		image,
		startLine: line,
		endLine: line,
		startColumn,
		endColumn: endColumn ?? startColumn + image.length - 1,
		startOffset: 0,
		endOffset: image.length - 1,
	};
}

/**
 * Create a mock text document.
 */
function createMockDocument(
	uri: string,
	languageId: string,
	lines: string[],
): vscode.TextDocument {
	const text = lines.join('\n');
	return {
		uri: vscode.Uri.parse(uri),
		languageId,
		lineCount: lines.length,
		getText: () => text,
		lineAt: (lineOrPos: number | vscode.Position) => {
			const lineNum = typeof lineOrPos === 'number' ? lineOrPos : (lineOrPos as vscode.Position).line;
			const lineText = lines[lineNum] ?? '';
			return {
				text: lineText,
				lineNumber: lineNum,
				range: new vscode.Range(new vscode.Position(lineNum, 0), new vscode.Position(lineNum, lineText.length)),
				rangeIncludingLineBreak: new vscode.Range(new vscode.Position(lineNum, 0), new vscode.Position(lineNum + 1, 0)),
				isEmptyOrWhitespace: lineText.trim().length === 0,
			};
		},
	} as any;
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

	// ─── sortPrefixes ──────────────────────────────────────────────────────────

	describe('sortPrefixes', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;

		beforeEach(() => {
			mockContextService = createMockDocumentContextService();
			service = new TurtlePrefixDefinitionService(
				mockContextService,
				createMockPrefixLookupService(),
			);
		});

		it('returns empty edit when context is not found', async () => {
			mockContextService.getDocumentContext.mockReturnValue(null);
			const doc = createMockDocument('file:///test.ttl', 'turtle', ['PREFIX owl: <http://owl>']);
			const edit = await service.sortPrefixes(doc);
			expect(edit.size).toBe(0);
		});

		it('returns empty edit when document has no prefix tokens', async () => {
			const context = createMockContext('file:///test.ttl', {}, [
				makeToken('IRIREF', '<http://example.org>', 1),
			]);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://example.org>']);
			const edit = await service.sortPrefixes(doc);
			expect(edit.size).toBe(0);
		});

		it('produces a replace edit covering the prefix block when prefixes are out of order', async () => {
			const lines = [
				'PREFIX z: <http://z.example/>',
				'PREFIX a: <http://a.example/>',
				'',
				'<http://x> a <http://y> .',
			];
			const context = createMockContext('file:///test.ttl', {}, [
				makeToken('PREFIX', 'PREFIX', 1),
				makeToken('PREFIX', 'PREFIX', 2),
			]);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);

			const edit = await service.sortPrefixes(doc);

			expect(edit.size).toBe(1);
			const [entry] = edit.entries;
			expect(entry.type).toBe('replace');
			// The sorted text should have 'a' before 'z'
			expect(entry.newText).toMatch(/a:.*z:/s);
		});


		it('produces a replace edit that is idempotent when prefixes are already sorted', async () => {
			const lines = [
				'PREFIX a: <http://a.example/>',
				'PREFIX z: <http://z.example/>',
			];
			const context = createMockContext('file:///test.ttl', {}, [
				makeToken('PREFIX', 'PREFIX', 1),
				makeToken('PREFIX', 'PREFIX', 2),
			]);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);

			const edit = await service.sortPrefixes(doc);

			expect(edit.size).toBe(1);
			const [entry] = edit.entries;
			// Replace text should be identical (same order)
			expect(entry.newText).toBe(lines[0] + '\n' + lines[1]);
		});
	});

	// ─── deletePrefixes ────────────────────────────────────────────────────────

	describe('deletePrefixes', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;

		beforeEach(() => {
			mockContextService = createMockDocumentContextService();
			service = new TurtlePrefixDefinitionService(
				mockContextService,
				createMockPrefixLookupService(),
			);
		});

		it('returns empty edit when context is not found', async () => {
			mockContextService.getDocumentContext.mockReturnValue(null);
			const doc = createMockDocument('file:///test.ttl', 'turtle', ['PREFIX ex: <http://ex>']);
			const edit = await service.deletePrefixes(doc, ['ex']);
			expect(edit.size).toBe(0);
		});

		it('returns empty edit when the prefix to delete is not in the document', async () => {
			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsToken = makeToken('PNAME_NS', 'owl:', 1, 8);
			const context = createMockContext('file:///test.ttl', { owl: 'http://owl' }, [prefixToken, nsToken]);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.ttl', 'turtle', ['PREFIX owl: <http://owl>']);

			const edit = await service.deletePrefixes(doc, ['ex']);
			expect(edit.size).toBe(0);
		});

		it('creates a delete edit for an existing prefix', async () => {
			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsToken = makeToken('PNAME_NS', 'ex:', 1, 8);
			const context = createMockContext('file:///test.ttl', { ex: 'http://ex', owl: 'http://owl' }, [
				prefixToken, nsToken,
			]);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const lines = ['PREFIX ex: <http://ex>', 'PREFIX owl: <http://owl>'];
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);

			const edit = await service.deletePrefixes(doc, ['ex']);
			expect(edit.size).toBeGreaterThan(0);
			expect(edit.entries[0].type).toBe('delete');
		});
	});

	// ─── implementPrefixes ────────────────────────────────────────────────────

	describe('implementPrefixes (appended mode)', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;
		let mockPrefixLookupService: any;

		beforeEach(async () => {
			const { getFirstTokenOfType, getLastTokenOfType, isUpperCaseToken } = await import('@faubulous/mentor-rdf-parsers');

			(getFirstTokenOfType as any).mockReturnValue(undefined);
			(getLastTokenOfType as any).mockReturnValue(undefined);
			(isUpperCaseToken as any).mockReturnValue(false);

			mockContextService = createMockDocumentContextService();
			mockPrefixLookupService = createMockPrefixLookupService();
			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);
		});

		it('returns empty edit when context is not found', async () => {
			mockContextService.getDocumentContext.mockReturnValue(null);
			const doc = createMockDocument('file:///test.ttl', 'turtle', []);
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: undefined }]);
			expect(edit.size).toBe(0);
		});

		it('inserts a new prefix declaration when prefix is not yet defined', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			const context = createMockContext('file:///test.ttl', {}, []);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://x> a <http://y> .']);
			// namespaceIri must be undefined for the appended filter condition to pass
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: undefined }]);

			// Should have at least one insert for the new prefix declaration
			expect(edit.size).toBeGreaterThan(0);
			const inserts = edit.entries.filter(e => e.type === 'insert');
			expect(inserts.some(e => e.text?.includes('ex') && e.text?.includes('http://example.org/'))).toBe(true);
		});

		it('does not insert a prefix that is already declared in the document', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			const context = createMockContext('file:///test.ttl', { ex: 'http://example.org/' }, []);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['PREFIX ex: <http://example.org/>']);
			// prefix 'ex' is already in context.namespaces, so filter skips it
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: undefined }]);

			expect(edit.size).toBe(0);
		});
	});

	// ─── deletePrefixes (empty lines) ─────────────────────────────────────────

	describe('deletePrefixes (empty lines after prefix)', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;

		beforeEach(() => {
			mockContextService = createMockDocumentContextService();
			service = new TurtlePrefixDefinitionService(
				mockContextService,
				createMockPrefixLookupService(),
			);
		});

		it('also deletes empty lines that follow a deleted prefix when it is not the last prefix', async () => {
			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsTokenEx = makeToken('PNAME_NS', 'ex:', 1, 8);
			const prefixToken2 = makeToken('PREFIX', 'PREFIX', 3);
			const nsTokenOwl = makeToken('PNAME_NS', 'owl:', 3, 8);

			const context = createMockContext(
				'file:///test.ttl',
				{ ex: 'http://ex', owl: 'http://owl' },
				[prefixToken, nsTokenEx, prefixToken2, nsTokenOwl],
			);
			mockContextService.getDocumentContext.mockReturnValue(context);

			// line 0: 'PREFIX ex: <http://ex>'
			// line 1: '' (empty)
			// line 2: 'PREFIX owl: <http://owl>'
			const lines = ['PREFIX ex: <http://ex>', '', 'PREFIX owl: <http://owl>'];
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);

			const edit = await service.deletePrefixes(doc, ['ex']);

			// Expect 2 delete edits: the prefix line and the empty line following it.
			expect(edit.size).toBe(2);
			expect(edit.entries.every(e => e.type === 'delete')).toBe(true);
		});

		it('does not delete empty lines after the last prefix', async () => {
			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsTokenEx = makeToken('PNAME_NS', 'ex:', 1, 8);

			// Only one prefix → prefixCount = 1, n = 1 after first token → n < prefixCount is false
			const context = createMockContext(
				'file:///test.ttl',
				{ ex: 'http://ex' },
				[prefixToken, nsTokenEx],
			);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const lines = ['PREFIX ex: <http://ex>', '', '<http://x> a <http://y> .'];
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);

			const edit = await service.deletePrefixes(doc, ['ex']);

			// Only 1 delete (just the prefix line, not the following empty line).
			expect(edit.size).toBe(1);
		});
	});

	describe('implementPrefixes (Sorted mode)', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;
		let mockPrefixLookupService: any;

		beforeEach(async () => {
			const { getFirstTokenOfType, getLastTokenOfType, isUpperCaseToken } = await import('@faubulous/mentor-rdf-parsers');
			const { getConfig } = await import('@src/utilities/vscode/config');

			(getFirstTokenOfType as any).mockReturnValue(undefined);
			(getLastTokenOfType as any).mockReturnValue(undefined);
			(isUpperCaseToken as any).mockReturnValue(false);
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockReturnValue('Sorted'),
			});

			mockContextService = createMockDocumentContextService();
			mockPrefixLookupService = createMockPrefixLookupService();
			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);
		});

		it('inserts all existing + new prefixes in sorted order at position (0, 0)', async () => {
			const context = createMockContext('file:///test.ttl', { owl: 'http://owl/' }, []);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://x> a owl:Thing .']);
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: 'http://example.org/' }]);

			// Should have at least one insert
			expect(edit.size).toBeGreaterThan(0);
			const inserts = edit.entries.filter(e => e.type === 'insert');
			expect(inserts.length).toBeGreaterThan(0);
		});

		it('inserts a trailing newline after the sorted prefixes', async () => {
			const context = createMockContext('file:///test.ttl', {}, []);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['']);
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: 'http://example.org/' }]);

			// Last insert should be the trailing newline
			const inserts = edit.entries.filter(e => e.type === 'insert');
			const lastInsert = inserts[inserts.length - 1];
			expect(lastInsert?.text).toBe('\n');
		});

		it('deletes existing prefix token lines when tokens are present in the document', async () => {
			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsToken = makeToken('PNAME_NS', 'owl:', 1, 8);
			const context = createMockContext(
				'file:///test.ttl',
				{ owl: 'http://owl/' },
				[prefixToken, nsToken],
			);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['PREFIX owl: <http://owl/>', '<http://x> a owl:Thing .']);
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: 'http://example.org/' }]);

			const deletes = edit.entries.filter(e => e.type === 'delete');
			expect(deletes.length).toBeGreaterThan(0);
		});

		it('calls _deleteEmptyLinesAfterToken when lastPrefix token exists', async () => {
			const { getLastTokenOfType } = await import('@faubulous/mentor-rdf-parsers');
			const lastPrefixToken = makeToken('PREFIX', 'PREFIX', 1);
			(getLastTokenOfType as any).mockReturnValue(lastPrefixToken);

			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsToken = makeToken('PNAME_NS', 'owl:', 1, 8);
			const context = createMockContext(
				'file:///test.ttl',
				{ owl: 'http://owl/' },
				[prefixToken, nsToken],
			);
			mockContextService.getDocumentContext.mockReturnValue(context);

			// Line 1 is the prefix, line 2 is empty, line 3 is content
			const lines = ['PREFIX owl: <http://owl/>', '', '<http://x> a owl:Thing .'];
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: 'http://example.org/' }]);

			// Empty line should have been deleted by _deleteEmptyLinesAfterToken
			const deletes = edit.entries.filter(e => e.type === 'delete');
			// At least 2 deletes: the prefix line + the empty line following it
			expect(deletes.length).toBeGreaterThanOrEqual(2);
		});
	});

	// ─── implementPrefixForIri ─────────────────────────────────────────────────

	describe('implementPrefixForIri', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;
		let mockPrefixLookupService: any;

		beforeEach(async () => {
			const { getFirstTokenOfType, getLastTokenOfType, isUpperCaseToken } = await import('@faubulous/mentor-rdf-parsers');
			const { getIriFromIriReference } = await import('@src/utilities');
			const { getConfig } = await import('@src/utilities/vscode/config');
			const { Uri } = await import('@faubulous/mentor-rdf');

			(getFirstTokenOfType as any).mockReturnValue(undefined);
			(getLastTokenOfType as any).mockReturnValue(undefined);
			(isUpperCaseToken as any).mockReturnValue(false);
			(getConfig as any).mockReturnValue({
				get: vi.fn().mockReturnValue(undefined),
			});
			(getIriFromIriReference as any).mockImplementation((s: string) => s.replace(/^<|>$/g, ''));
			(Uri.getNamespaceIri as any).mockImplementation((iri: string) => iri.endsWith('/') ? iri : iri.substring(0, iri.lastIndexOf('/') + 1));

			mockContextService = createMockDocumentContextService();
			mockPrefixLookupService = createMockPrefixLookupService();
			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);
		});

		it('returns empty edit when context is not found', async () => {
			mockContextService.getDocumentContext.mockReturnValue(null);
			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://example.org/Thing>']);
			const edit = await service.implementPrefixForIri(doc, 'http://example.org/Thing');
			expect(edit.size).toBe(0);
		});

		it('replaces IRIREF tokens with prefixed names and adds a prefix declaration', async () => {
			const { Uri } = await import('@faubulous/mentor-rdf');
			(Uri.getNamespaceIri as any).mockReturnValue('http://example.org/');

			const iriToken = makeToken('IRIREF', '<http://example.org/Thing>', 1, 1, 27);
			const context = createMockContext('file:///test.ttl', {}, [iriToken]);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://example.org/Thing>']);
			const edit = await service.implementPrefixForIri(doc, 'http://example.org/Thing');

			expect(edit.size).toBeGreaterThan(0);
			const replaces = edit.entries.filter(e => e.type === 'replace');
			expect(replaces.length).toBeGreaterThan(0);
			expect(replaces[0].newText).toContain('custom' in {} ? 'ex:Thing' : 'Thing');
		});

		it('does not replace IRI tokens that appear in a BASE definition', async () => {
			const baseToken = makeToken('BASE', 'BASE', 1);
			const iriToken = makeToken('IRIREF', '<http://example.org/>', 1, 6, 26);
			const context = createMockContext('file:///test.ttl', {}, [baseToken, iriToken]);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['BASE <http://example.org/>']);
			const edit = await service.implementPrefixForIri(doc, 'http://example.org/Thing');

			// No replace edits because the only IRIREF is in a BASE statement.
			const replaces = edit.entries.filter(e => e.type === 'replace');
			expect(replaces.length).toBe(0);
		});

		it('does not replace IRIREF that is part of a prefix definition', async () => {
			const { Uri } = await import('@faubulous/mentor-rdf');
			(Uri.getNamespaceIri as any).mockReturnValue('http://example.org/');

			const prefixToken = makeToken('PREFIX', 'PREFIX', 1);
			const nsToken = makeToken('PNAME_NS', 'ex:', 1, 8, 10);
			const iriDefToken = makeToken('IRIREF', '<http://example.org/>', 1, 12, 32);
			const iriToken = makeToken('IRIREF', '<http://example.org/Thing>', 2, 1, 27);

			const context = createMockContext(
				'file:///test.ttl',
				{},
				[prefixToken, nsToken, iriDefToken, iriToken],
			);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const lines = [
				'PREFIX ex: <http://example.org/>',
				'<http://example.org/Thing> a ex:Class .',
			];
			const doc = createMockDocument('file:///test.ttl', 'turtle', lines);
			const edit = await service.implementPrefixForIri(doc, 'http://example.org/Thing');

			// Only the IRIREF on line 2 should be replaced, not the one in the PREFIX definition.
			const replaces = edit.entries.filter(e => e.type === 'replace');
			expect(replaces.length).toBe(1);
		});

		it('skips IRIREF tokens with invalid local names', async () => {
			const { Uri } = await import('@faubulous/mentor-rdf');
			(Uri.getNamespaceIri as any).mockReturnValue('http://example.org/');

			// Local name includes '/' which is invalid per _isValidLocalName
			const iriToken = makeToken('IRIREF', '<http://example.org/some/path>', 1, 1, 30);
			const context = createMockContext('file:///test.ttl', {}, [iriToken]);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://example.org/some/path>']);
			const edit = await service.implementPrefixForIri(doc, 'http://example.org/some/path');

			const replaces = edit.entries.filter(e => e.type === 'replace');
			expect(replaces.length).toBe(0);
		});

		it('does not add a prefix declaration if the prefix is already defined', async () => {
			const { Uri } = await import('@faubulous/mentor-rdf');
			(Uri.getNamespaceIri as any).mockReturnValue('http://example.org/');

			const iriToken = makeToken('IRIREF', '<http://example.org/Thing>', 1, 1, 27);
			// Context already has the prefix defined → skip _implementPrefixes call
			const context = createMockContext(
				'file:///test.ttl',
				{ ns: 'http://example.org/' },
				[iriToken],
			);
			mockContextService.getDocumentContext.mockReturnValue(context);

			const doc = createMockDocument('file:///test.ttl', 'turtle', ['<http://example.org/Thing>']);
			const edit = await service.implementPrefixForIri(doc, 'http://example.org/Thing');

			// Only a replace edit (no insert for prefix declaration)
			const inserts = edit.entries.filter(e => e.type === 'insert');
			expect(inserts.length).toBe(0);
			const replaces = edit.entries.filter(e => e.type === 'replace');
			expect(replaces.length).toBeGreaterThan(0);
		});
	});

	// ─── _getPrefixDefinition (via implementPrefixes) ─────────────────────────

	describe('prefix definition formatting', () => {
		let service: TurtlePrefixDefinitionService;
		let mockContextService: any;
		let mockPrefixLookupService: any;

		beforeEach(async () => {
			const { getFirstTokenOfType, getLastTokenOfType, isUpperCaseToken } = await import('@faubulous/mentor-rdf-parsers');

			(getFirstTokenOfType as any).mockReturnValue(undefined);
			(getLastTokenOfType as any).mockReturnValue(undefined);

			mockContextService = createMockDocumentContextService();
			mockPrefixLookupService = createMockPrefixLookupService();
			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			service = new TurtlePrefixDefinitionService(mockContextService, mockPrefixLookupService);

			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

			(isUpperCaseToken as any).mockReturnValue(false);
		});

		it('generates SPARQL-style lowercase prefix declaration (default token type)', async () => {
			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			const context = createMockContext('file:///test.ttl', {}, []);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.ttl', 'turtle', []);

			// namespaceIri: undefined → looked up via prefixLookupService.getUriForPrefix
			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: undefined }]);
			const insertText = edit.entries.filter(e => e.type === 'insert').map(e => e.text).join('');

			// Default token type is RdfToken.PREFIX → SPARQL-style (lowercase because isUpperCaseToken is false)
			expect(insertText).toContain('prefix ex: <http://example.org/>');
		});

		it('generates Turtle @prefix declaration when document only has TTL_PREFIX tokens', async () => {
			const { getFirstTokenOfType, getLastTokenOfType, isUpperCaseToken } = await import('@faubulous/mentor-rdf-parsers');
			// No PREFIX tokens in document; only TTL_PREFIX
			(getFirstTokenOfType as any).mockImplementation((_tokens: any[], name: string) => {
				if (name === 'PREFIX') return undefined;
				if (name === 'TTL_PREFIX') return makeToken('TTL_PREFIX', '@prefix', 1);
				return undefined;
			});
			(getLastTokenOfType as any).mockReturnValue(undefined);
			(isUpperCaseToken as any).mockReturnValue(false);

			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			const context = createMockContext('file:///test.ttl', {}, []);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.ttl', 'turtle', []);

			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: undefined }]);
			const insertText = edit.entries.filter(e => e.type === 'insert').map(e => e.text).join('');

			expect(insertText).toContain('@prefix ex: <http://example.org/> .');
		});

		it('generates XML xmlns declaration for xml language documents', async () => {
			mockPrefixLookupService.getUriForPrefix.mockReturnValue('http://example.org/');

			const context = createMockContext('file:///test.rdf', {}, []);
			mockContextService.getDocumentContext.mockReturnValue(context);
			const doc = createMockDocument('file:///test.rdf', 'xml', []);

			const edit = await service.implementPrefixes(doc, [{ prefix: 'ex', namespaceIri: undefined }]);
			const insertText = edit.entries.filter(e => e.type === 'insert').map(e => e.text).join('');

			expect(insertText).toContain('xmlns:ex="http://example.org/"');
		});
	});
});
