import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver-types';
import {
	NamespacePrefixLinter,
	DUPLICATE_PREFIX_CODE,
	INVALID_NAMESPACE_URI_CODE,
	UNUSED_NAMESPACE_PREFIX_CODE,
} from './namespace-prefix-linter';

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

function runProvider(rule: any, ctx: { document: any; content: string; tokens: any[]; prefixes: any }) {
	rule.reset?.();
	const result = ctx.tokens.flatMap((t: any, i: number) => rule.visitToken(ctx, t, i));
	result.push(...(rule.finalize?.(ctx) ?? []));
	return result;
}

function makeDoc(content = '') {
	return TextDocument.create('file:///test.ttl', 'turtle', 1, content);
}

function makeToken(name: string, image: string, offset = 0, line = 1) {
	return {
		tokenType: { name },
		image,
		startOffset: offset,
		endOffset: offset + image.length - 1,
		startLine: line,
		startColumn: 1,
		endLine: line,
		endColumn: image.length,
	};
}

function makePrefixTokens(keyword: string, prefixImage: string, iriImage: string, offset = 0, line = 1) {
	const kw = makeToken(keyword === '@prefix' ? 'TTL_PREFIX' : 'PREFIX', keyword, offset, line);
	const ns = makeToken('PNAME_NS', prefixImage, offset + keyword.length + 1, line);
	const iri = makeToken('IRIREF', iriImage, offset + keyword.length + 1 + prefixImage.length + 1, line);
	return [kw, ns, iri];
}

describe('NamespacePrefixLinter', () => {
	let rule: NamespacePrefixLinter;

	beforeEach(() => {
		rule = new NamespacePrefixLinter();
	});

	describe('duplicate prefix detection', () => {
		it('returns no diagnostics when prefixes are declared once', () => {
			const tokens = [
				...makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1),
				...makePrefixTokens('PREFIX', 'owl:', '<http://www.w3.org/2002/07/owl#>', 30, 2),
			];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const dups = diags.filter(d => d.code === DUPLICATE_PREFIX_CODE);
			expect(dups).toHaveLength(0);
		});

		it('returns a warning when the same prefix is declared twice', () => {
			const tokens = [
				...makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1),
				...makePrefixTokens('PREFIX', 'ex:', '<http://example.com/>', 30, 2),
				makeToken('PNAME_LN', 'ex:Thing', 60, 3),
			];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const dups = diags.filter(d => d.code === DUPLICATE_PREFIX_CODE);
			expect(dups).toHaveLength(1);
			expect(dups[0].severity).toBe(DiagnosticSeverity.Warning);
			expect(dups[0].message).toContain("'ex'");
		});

		it('flags the second declaration line', () => {
			const first = makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1);
			const second = makePrefixTokens('PREFIX', 'ex:', '<http://example.com/>', 30, 5);
			const use = makeToken('PNAME_LN', 'ex:Thing', 60, 6);
			const tokens = [...first, ...second, use];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const dup = diags.find(d => d.code === DUPLICATE_PREFIX_CODE)!;
			expect(dup.range.start.line).toBe(4); // 0-based line 4 = startLine 5
		});

		it('uses TTL_PREFIX (@prefix) token type as well', () => {
			const tokens = [
				...makePrefixTokens('@prefix', 'ex:', '<http://example.org/>', 0, 1),
				...makePrefixTokens('@prefix', 'ex:', '<http://example.com/>', 30, 2),
				makeToken('PNAME_LN', 'ex:Thing', 60, 3),
			];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const dups = diags.filter(d => d.code === DUPLICATE_PREFIX_CODE);
			expect(dups).toHaveLength(1);
		});
	});

	describe('invalid namespace URI detection', () => {
		it('returns an error for an empty namespace URI', () => {
			// Simulate getNamespaceDefinition returning uri=''
			// This happens when the IRIREF is '<>'
			const kw = makeToken('PREFIX', 'PREFIX', 0, 1);
			const ns = makeToken('PNAME_NS', 'ex:', 7, 1);
			const iri = makeToken('IRIREF', '<>', 11, 1);
			const tokens = [kw, ns, iri];

			const diags = runProvider(rule, { document: makeDoc('PREFIX ex: <>'), content: '', tokens, prefixes: {} });
			const errors = diags.filter(d => d.code === INVALID_NAMESPACE_URI_CODE);
			expect(errors).toHaveLength(1);
			expect(errors[0].severity).toBe(DiagnosticSeverity.Error);
		});
	});

	describe('unused prefix detection', () => {
		it('returns a hint for a prefix that is declared but never used', () => {
			const tokens = makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1);
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(1);
			expect(hints[0].severity).toBe(DiagnosticSeverity.Hint);
			expect(hints[0].tags).toContain(DiagnosticTag.Unnecessary);
			expect(hints[0].message).toContain("'ex'");
		});

		it('returns no hint when a PNAME_LN token uses the prefix', () => {
			const tokens = [
				...makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1),
				makeToken('PNAME_LN', 'ex:Thing', 30, 2),
			];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(0);
		});

		it('returns no hint when a PNAME_NS token (not in a declaration) uses the prefix', () => {
			// A PNAME_NS token not preceded by PREFIX/TTL_PREFIX counts as a usage
			const prefixTokens = makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1);
			const useToken = makeToken('PNAME_NS', 'ex:', 30, 2);
			const prevToken = makeToken('IRIREF', '<http://something/>', 10, 2); // not PREFIX
			const tokens = [...prefixTokens, prevToken, useToken];

			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(0);
		});

		it('does not count the PNAME_NS in a prefix declaration as a usage', () => {
			const tokens = makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1);
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(1);
		});

		it('returns hints for multiple unused prefixes', () => {
			const tokens = [
				...makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 1),
				...makePrefixTokens('PREFIX', 'owl:', '<http://www.w3.org/2002/07/owl#>', 30, 2),
			];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(2);
		});

		it('reports hint on the line of the prefix keyword token', () => {
			const tokens = makePrefixTokens('PREFIX', 'ex:', '<http://example.org/>', 0, 3);
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const hint = diags.find(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE)!;
			expect(hint.range.start.line).toBe(2); // 0-based line 2 = startLine 3
		});

		it('does not flag a prefix used only in the triplate frontmatter', () => {
			// The overlay makes the frontmatter non-opaque: `schema:Person` in an example value
			// is a real PNAME_LN token, so the linter counts it as a use like any other.
			const raw = '---\nparams { type: iri }\nexample x { type: schema:Person }\n---\nPREFIX schema: <http://schema.org/>\nSELECT * WHERE { ?s a ${type} }';
			const tokens = [
				makeToken('PNAME_LN', 'schema:Person', 35, 3), // frontmatter example value
				...makePrefixTokens('PREFIX', 'schema:', '<http://schema.org/>', 60, 5),
			];

			const diags = runProvider(rule, { document: makeDoc(raw), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(0);
		});

		it('still flags a prefix that is unused even in the frontmatter', () => {
			const raw = '---\nparams { type: iri }\nexample x { type: schema:Person }\n---\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nSELECT * WHERE {}';
			const tokens = [
				makeToken('PNAME_LN', 'schema:Person', 35, 3), // frontmatter value uses schema, not foaf
				...makePrefixTokens('PREFIX', 'foaf:', '<http://xmlns.com/foaf/0.1/>', 60, 5),
			];

			const diags = runProvider(rule, { document: makeDoc(raw), content: '', tokens, prefixes: {} });
			const hints = diags.filter(d => d.code === UNUSED_NAMESPACE_PREFIX_CODE);
			expect(hints).toHaveLength(1);
			expect(hints[0].message).toContain("'foaf'");
		});
	});

	describe('edge cases', () => {
		it('handles tokens without tokenType gracefully', () => {
			const bad = { image: '???', startOffset: 0, endOffset: 2 };
			expect(() => runProvider(rule, { document: makeDoc(), content: '', tokens: [bad as any], prefixes: {} })).not.toThrow();
		});

		it('returns no diagnostics for empty token list', () => {
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens: [], prefixes: {} });
			expect(diags).toHaveLength(0);
		});

		it('skips Unknown tokens', () => {
			const tokens = [makeToken('Unknown', '???', 0)];
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(0);
		});
	});
});
