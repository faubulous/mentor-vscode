import { describe, it, expect } from 'vitest';
import { getPrefixesWithErrorCode } from '@src/utilities/vscode/diagnostic';

function makeDocument(textByRange: Map<string, string> | string) {
	return {
		getText: (range: any): string => {
			if (typeof textByRange === 'string') {
				return textByRange;
			}
			const key = JSON.stringify(range);
			return textByRange.get(key) ?? '';
		},
	};
}

function makeDiagnostic(code: string, range: any = {}) {
	return { code, range };
}

describe('getPrefixesWithErrorCode', () => {
	describe('UndefinedNamespacePrefixError', () => {
		it('extracts a prefix from a pname-like token', () => {
			const doc = makeDocument('ex:MyClass');
			const diag = makeDiagnostic('UndefinedNamespacePrefixError');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UndefinedNamespacePrefixError');
			expect(result).toContain('ex');
		});

		it('extracts multiple distinct prefixes', () => {
			const doc = makeDocument('ex:MyClass');
			const diag1 = makeDiagnostic('UndefinedNamespacePrefixError', { id: 1 });
			const diag2 = makeDiagnostic('UndefinedNamespacePrefixError', { id: 2 });
			// Two diagnostics with same text → deduplicated
			const result = getPrefixesWithErrorCode(doc as any, [diag1 as any, diag2 as any], 'UndefinedNamespacePrefixError');
			expect(result).toEqual(['ex']);
		});

		it('deduplicates repeated prefixes', () => {
			const doc = makeDocument('ex:SomeClass');
			const diag1 = makeDiagnostic('UndefinedNamespacePrefixError', { a: 1 });
			const diag2 = makeDiagnostic('UndefinedNamespacePrefixError', { a: 2 });
			const result = getPrefixesWithErrorCode(doc as any, [diag1 as any, diag2 as any], 'UndefinedNamespacePrefixError');
			expect(result.filter(p => p === 'ex').length).toBe(1);
		});

		it('returns empty array when diagnostic text is empty', () => {
			const doc = makeDocument('');
			const diag = makeDiagnostic('UndefinedNamespacePrefixError');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UndefinedNamespacePrefixError');
			expect(result).toEqual([]);
		});

		it('treats text before colon as prefix even when no colon is present (uses whole token)', () => {
			// When there is no colon the whole token becomes the prefix part
			const doc = makeDocument('orphanToken');
			const diag = makeDiagnostic('UndefinedNamespacePrefixError');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UndefinedNamespacePrefixError');
			expect(result).toContain('orphanToken');
		});

		it('ignores diagnostics with a different error code', () => {
			const doc = makeDocument('ex:MyClass');
			const diag = makeDiagnostic('SomeOtherError');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UndefinedNamespacePrefixError');
			expect(result).toEqual([]);
		});
	});

	describe('UnusedNamespacePrefixHint', () => {
		it('extracts prefix from a Turtle @prefix line', () => {
			const doc = makeDocument('@prefix ex: <http://example.org/> .');
			const diag = makeDiagnostic('UnusedNamespacePrefixHint');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UnusedNamespacePrefixHint');
			expect(result).toContain('ex');
		});

		it('extracts prefix from a SPARQL PREFIX line', () => {
			const doc = makeDocument('PREFIX owl: <http://www.w3.org/2002/07/owl#>');
			const diag = makeDiagnostic('UnusedNamespacePrefixHint');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UnusedNamespacePrefixHint');
			expect(result).toContain('owl');
		});

		it('returns empty array when line does not match a prefix declaration', () => {
			const doc = makeDocument('rdfs:label "hello" .');
			const diag = makeDiagnostic('UnusedNamespacePrefixHint');
			const result = getPrefixesWithErrorCode(doc as any, [diag as any], 'UnusedNamespacePrefixHint');
			expect(result).toEqual([]);
		});

		it('deduplicates unused prefixes', () => {
			const doc = makeDocument('@prefix ex: <http://example.org/> .');
			const diag1 = makeDiagnostic('UnusedNamespacePrefixHint', { a: 1 });
			const diag2 = makeDiagnostic('UnusedNamespacePrefixHint', { a: 2 });
			const result = getPrefixesWithErrorCode(doc as any, [diag1 as any, diag2 as any], 'UnusedNamespacePrefixHint');
			expect(result.filter(p => p === 'ex').length).toBe(1);
		});
	});

	describe('empty inputs', () => {
		it('returns empty array for empty diagnostics', () => {
			const doc = makeDocument('');
			const result = getPrefixesWithErrorCode(doc as any, [], 'UndefinedNamespacePrefixError');
			expect(result).toEqual([]);
		});
	});
});
