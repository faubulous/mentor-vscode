import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/browser';
import { XsdDatatypeValidationLinter } from './xsd-datatype-validation-linter';

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

/**
 * Builds a [literal, ^^, <datatype>] token triple.
 */
function xsdTokens(literalImage: string, xsdIri: string, tokenType = 'STRING_LITERAL_QUOTE') {
	const lit = makeToken(tokenType, literalImage, 0);
	const dc = makeToken('DCARET', '^^', literalImage.length);
	const dt = makeToken('IRIREF', `<${xsdIri}>`, literalImage.length + 2);
	return [lit, dc, dt];
}

describe('XsdDatatypeValidationLinter', () => {
	let rule: XsdDatatypeValidationLinter;

	beforeEach(() => {
		rule = new XsdDatatypeValidationLinter();
	});

	it('returns no diagnostics when there are no DoubleCaret tokens', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:Thing')];
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('skips DoubleCaret at end of token stream (boundary check)', () => {
		const tokens = [
			makeToken('STRING_LITERAL_QUOTE', '"hello"', 0),
			makeToken('DCARET', '^^', 7),
		];
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns no diagnostics for unknown datatypes', () => {
		const tokens = xsdTokens('"anything"', 'http://example.org/myType');
		const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	describe('xsd:boolean', () => {
		it('returns no diagnostic for "true"', () => {
			const tokens = xsdTokens('"true"', 'http://www.w3.org/2001/XMLSchema#boolean');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns no diagnostic for "false"', () => {
			const tokens = xsdTokens('"false"', 'http://www.w3.org/2001/XMLSchema#boolean');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for invalid boolean', () => {
			const tokens = xsdTokens('"yes"', 'http://www.w3.org/2001/XMLSchema#boolean');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
			expect(diags[0].severity).toBe(DiagnosticSeverity.Warning);
			expect(diags[0].message).toContain('boolean');
		});
	});

	describe('xsd:integer', () => {
		it('returns no diagnostic for a valid integer', () => {
			const tokens = xsdTokens('"42"', 'http://www.w3.org/2001/XMLSchema#integer');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for a non-numeric integer', () => {
			const tokens = xsdTokens('"abc"', 'http://www.w3.org/2001/XMLSchema#integer');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('integer');
		});
	});

	describe('xsd:int', () => {
		it('returns no diagnostic for a value within range', () => {
			const tokens = xsdTokens('"2147483647"', 'http://www.w3.org/2001/XMLSchema#int');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for a value above the max', () => {
			const tokens = xsdTokens('"2147483648"', 'http://www.w3.org/2001/XMLSchema#int');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			const range = diags.find(d => d.message.includes('[-2147483648, 2147483647]'));
			expect(range).toBeDefined();
		});

		it('returns a warning for a value below the min', () => {
			const tokens = xsdTokens('"-2147483649"', 'http://www.w3.org/2001/XMLSchema#int');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('[-2147483648, 2147483647]'))).toBeDefined();
		});
	});

	describe('xsd:short', () => {
		it('returns no diagnostic for a valid short', () => {
			const tokens = xsdTokens('"32767"', 'http://www.w3.org/2001/XMLSchema#short');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for a value outside short range', () => {
			const tokens = xsdTokens('"32768"', 'http://www.w3.org/2001/XMLSchema#short');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('[-32768, 32767]'))).toBeDefined();
		});
	});

	describe('xsd:long', () => {
		it('returns no diagnostic for a valid long', () => {
			const tokens = xsdTokens('"9223372036854775807"', 'http://www.w3.org/2001/XMLSchema#long');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});
	});

	describe('xsd:decimal / xsd:double / xsd:float', () => {
		it('returns no diagnostic for a valid decimal', () => {
			const tokens = xsdTokens('"3.14"', 'http://www.w3.org/2001/XMLSchema#decimal');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for a non-numeric decimal', () => {
			const tokens = xsdTokens('"abc"', 'http://www.w3.org/2001/XMLSchema#decimal');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
		});

		it('returns no diagnostic for a valid double', () => {
			const tokens = xsdTokens('"1.5e10"', 'http://www.w3.org/2001/XMLSchema#double');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns no diagnostic for a valid float', () => {
			const tokens = xsdTokens('"1.5"', 'http://www.w3.org/2001/XMLSchema#float');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});
	});

	describe('xsd:date', () => {
		it('returns no diagnostic for a valid date', () => {
			const tokens = xsdTokens('"2024-01-15"', 'http://www.w3.org/2001/XMLSchema#date');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for an invalid date', () => {
			const tokens = xsdTokens('"not-a-date"', 'http://www.w3.org/2001/XMLSchema#date');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('YYYY-MM-DD');
		});

		it('accepts date with timezone', () => {
			const tokens = xsdTokens('"2024-01-15Z"', 'http://www.w3.org/2001/XMLSchema#date');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});
	});

	describe('xsd:dateTime', () => {
		it('returns no diagnostic for a valid dateTime', () => {
			const tokens = xsdTokens('"2024-01-15T10:30:00"', 'http://www.w3.org/2001/XMLSchema#dateTime');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for an invalid dateTime', () => {
			const tokens = xsdTokens('"not-a-datetime"', 'http://www.w3.org/2001/XMLSchema#dateTime');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
		});
	});

	describe('xsd:time', () => {
		it('returns no diagnostic for a valid time with UTC timezone', () => {
			const tokens = xsdTokens('"10:30:00Z"', 'http://www.w3.org/2001/XMLSchema#time');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns no diagnostic for a valid time with offset timezone', () => {
			const tokens = xsdTokens('"10:30:00+02:00"', 'http://www.w3.org/2001/XMLSchema#time');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for an invalid time', () => {
			const tokens = xsdTokens('"not-a-time"', 'http://www.w3.org/2001/XMLSchema#time');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('hh:mm:ss');
		});
	});

	describe('xsd:duration', () => {
		it('returns no diagnostic for a valid duration', () => {
			const tokens = xsdTokens('"P1Y2M3DT4H5M6S"', 'http://www.w3.org/2001/XMLSchema#duration');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for an invalid duration', () => {
			const tokens = xsdTokens('"not-a-duration"', 'http://www.w3.org/2001/XMLSchema#duration');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('PnYnMnDTnHnMnS');
		});
	});

	describe('xsd:negativeInteger', () => {
		it('returns no diagnostic for -1', () => {
			const tokens = xsdTokens('"-1"', 'http://www.w3.org/2001/XMLSchema#negativeInteger');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for 0', () => {
			const tokens = xsdTokens('"0"', 'http://www.w3.org/2001/XMLSchema#negativeInteger');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('< 0'))).toBeDefined();
		});

		it('returns a warning for a positive number', () => {
			const tokens = xsdTokens('"5"', 'http://www.w3.org/2001/XMLSchema#negativeInteger');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('< 0'))).toBeDefined();
		});
	});

	describe('xsd:nonNegativeInteger', () => {
		it('returns no diagnostic for 0', () => {
			const tokens = xsdTokens('"0"', 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for -1', () => {
			const tokens = xsdTokens('"-1"', 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('>= 0'))).toBeDefined();
		});
	});

	describe('xsd:nonPositiveInteger', () => {
		it('returns no diagnostic for 0', () => {
			const tokens = xsdTokens('"0"', 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for 1', () => {
			const tokens = xsdTokens('"1"', 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('<= 0'))).toBeDefined();
		});
	});

	describe('xsd:positiveInteger', () => {
		it('returns no diagnostic for 1', () => {
			const tokens = xsdTokens('"1"', 'http://www.w3.org/2001/XMLSchema#positiveInteger');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for 0', () => {
			const tokens = xsdTokens('"0"', 'http://www.w3.org/2001/XMLSchema#positiveInteger');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('> 0'))).toBeDefined();
		});

		it('returns a warning for a negative integer', () => {
			const tokens = xsdTokens('"-1"', 'http://www.w3.org/2001/XMLSchema#positiveInteger');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags.find(d => d.message.includes('> 0'))).toBeDefined();
		});
	});

	describe('xsd:base64Binary', () => {
		it('returns no diagnostic for a valid hex string', () => {
			const tokens = xsdTokens('"deadBEEF"', 'http://www.w3.org/2001/XMLSchema#base64Binary');
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('returns a warning for an invalid hex string', () => {
			const tokens = xsdTokens('"xyz!"', 'http://www.w3.org/2001/XMLSchema#base64Binary');
			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} });
			expect(diags).toHaveLength(1);
		});
	});

	describe('prefixed datatype resolution', () => {
		it('resolves boolean via prefixed name', () => {
			const lit = makeToken('STRING_LITERAL_QUOTE', '"yes"', 0);
			const dc = makeToken('DCARET', '^^', 5);
			const dt = makeToken('PNAME_LN', 'xsd:boolean', 7);
			const tokens = [lit, dc, dt];
			const prefixes = { xsd: 'http://www.w3.org/2001/XMLSchema#' };

			const diags = runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes });
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('boolean');
		});
	});

	describe('long string literal handling', () => {
		it('strips triple-quote delimiters for STRING_LITERAL_LONG_QUOTE', () => {
			const lit = makeToken('STRING_LITERAL_LONG_QUOTE', '"""true"""', 0);
			const dc = makeToken('DCARET', '^^', 10);
			const dt = makeToken('IRIREF', '<http://www.w3.org/2001/XMLSchema#boolean>', 12);
			const tokens = [lit, dc, dt];
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});

		it('strips single-quote delimiters for STRING_LITERAL_SINGLE_QUOTE', () => {
			const lit = makeToken('STRING_LITERAL_SINGLE_QUOTE', "'42'", 0);
			const dc = makeToken('DCARET', '^^', 4);
			const dt = makeToken('IRIREF', '<http://www.w3.org/2001/XMLSchema#integer>', 6);
			const tokens = [lit, dc, dt];
			expect(runProvider(rule, { document: makeDoc(), content: '', tokens, prefixes: {} })).toHaveLength(0);
		});
	});
});
