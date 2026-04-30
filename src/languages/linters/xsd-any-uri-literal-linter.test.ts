import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/browser';
import { XsdAnyUriLiteralLinter, XSD_ANY_URI_LITERAL_CODE } from '@src/languages/linters/xsd-any-uri-literal-linter';

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

function makeToken(name: string, image: string, offset = 0) {
	return {
		tokenType: { name },
		image,
		startOffset: offset,
		endOffset: offset + image.length - 1,
		startLine: 1,
		startColumn: 1,
		endLine: 1,
		endColumn: image.length,
	};
}

function xsdTokens(literalImage: string, xsdIri: string) {
	const lit = makeToken('STRING_LITERAL_QUOTE', literalImage, 0);
	const dc = makeToken('DCARET', '^^', literalImage.length);
	const dt = makeToken('IRIREF', `<${xsdIri}>`, literalImage.length + 2);
	return [lit, dc, dt];
}

describe('XsdAnyUriLiteralLinter', () => {
	let rule: XsdAnyUriLiteralLinter;

	beforeEach(() => {
		rule = new XsdAnyUriLiteralLinter();
	});

	it('returns no diagnostics when there are no DoubleCaret tokens', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:Thing')];
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns no diagnostics for non-anyURI typed literals', () => {
		const tokens = xsdTokens('"42"', 'http://www.w3.org/2001/XMLSchema#integer');
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns no diagnostics for non-http anyURI values', () => {
		const tokens = xsdTokens('"urn:example:foo"', 'http://www.w3.org/2001/XMLSchema#anyURI');
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns a diagnostic for http anyURI literal with full IRI type', () => {
		const tokens = xsdTokens('"http://example.com/"', 'http://www.w3.org/2001/XMLSchema#anyURI');
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });

		expect(diags).toHaveLength(1);
		expect(diags[0].code).toBe(XSD_ANY_URI_LITERAL_CODE);
		expect(diags[0].severity).toBe(DiagnosticSeverity.Hint);
		expect(diags[0].message).toContain('<http://example.com/>');
	});

	it('returns a diagnostic for https anyURI literal', () => {
		const tokens = xsdTokens('"https://example.com/foo"', 'http://www.w3.org/2001/XMLSchema#anyURI');
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });

		expect(diags).toHaveLength(1);
		expect(diags[0].message).toContain('<https://example.com/foo>');
	});

	it('returns a diagnostic for anyURI literal with prefixed datatype', () => {
		const lit = makeToken('STRING_LITERAL_QUOTE', '"http://example.com/"', 0);
		const dc = makeToken('DCARET', '^^', 20);
		const dt = makeToken('PNAME_LN', 'xsd:anyURI', 22);
		const tokens = [lit, dc, dt];
		const prefixes = { xsd: 'http://www.w3.org/2001/XMLSchema#' };

		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes });

		expect(diags).toHaveLength(1);
		expect(diags[0].code).toBe(XSD_ANY_URI_LITERAL_CODE);
	});

	it('skips DoubleCaret at end of token stream (boundary check)', () => {
		const tokens = [
			makeToken('STRING_LITERAL_QUOTE', '"http://example.com/"', 0),
			makeToken('DCARET', '^^', 20),
		];
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('diagnostic range covers the full expression from value to datatype', () => {
		const tokens = xsdTokens('"http://example.com/"', 'http://www.w3.org/2001/XMLSchema#anyURI');
		const doc = makeDoc('"http://example.com/"^^<http://www.w3.org/2001/XMLSchema#anyURI>');
		const diags = runProvider(rule, { document: doc, content: doc.getText(), tokens, prefixes: {} });

		expect(diags).toHaveLength(1);
		expect(diags[0].range.start).toEqual(doc.positionAt(tokens[0].startOffset));
		expect(diags[0].range.end).toEqual(doc.positionAt(tokens[2].endOffset + 1));
	});
});
