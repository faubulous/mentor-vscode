import { describe, it, expect, vi } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { XsdDatatypeValidationLinter } from './xsd-datatype-validation-linter';

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const XSD_NAMESPACE = 'http://www.w3.org/2001/XMLSchema#';

/**
 * A token as the linter reads it, at an offset of the document.
 * @param name The name of the token type.
 * @param image The text of the token.
 * @param offset The offset of its first character.
 * @returns The token.
 */
function makeToken(name: string, image: string, offset = 0) {
	return {
		tokenType: { name },
		image,
		startOffset: offset,
		endOffset: offset + image.length - 1,
		startLine: 1,
		startColumn: offset + 1,
		endLine: 1,
		endColumn: offset + image.length
	};
}

/**
 * The tokens `literal ^^ datatype`, the datatype written as given.
 * @param literal The literal, with its quotes.
 * @param datatype The datatype token, by its type name and text.
 * @param literalType The name of the token type of the literal.
 * @returns The tokens.
 */
function typedLiteralTokens(literal: string, datatype: { name: string; image: string }, literalType = 'STRING_LITERAL_QUOTE') {
	return [
		makeToken(literalType, literal, 0),
		makeToken('DCARET', '^^', literal.length),
		makeToken(datatype.name, datatype.image, literal.length + 2)
	];
}

/**
 * Lint tokens with the XSD datatype linter.
 * @param tokens The tokens.
 * @param prefixes The prefixes the document declares.
 * @returns The diagnostics.
 */
function lintTokens(tokens: ReturnType<typeof makeToken>[], prefixes: Record<string, string> = {}): Diagnostic[] {
	const content = tokens.map(token => token.image).join('');
	const document = TextDocument.create('file:///test.ttl', 'turtle', 1, content);
	const context = { positionAt: (offset: number) => document.positionAt(offset), content, tokens, prefixes } as any;
	const linter = new XsdDatatypeValidationLinter();

	return tokens.flatMap((token, index) => linter.visitToken(context, token as any, index));
}

/**
 * Lint a literal of an XSD datatype, written as a full IRI.
 * @param literal The literal, with its quotes.
 * @param localName The local name of the XSD datatype.
 * @param literalType The name of the token type of the literal.
 * @returns The diagnostics.
 */
function lint(literal: string, localName: string, literalType?: string): Diagnostic[] {
	return lintTokens(typedLiteralTokens(literal, { name: 'IRIREF', image: `<${XSD_NAMESPACE}${localName}>` }, literalType));
}

describe('XsdDatatypeValidationLinter', () => {
	it.each([
		['"true"', 'boolean'],
		['"0"', 'boolean'],
		['"1"', 'boolean'],
		['"42"', 'integer'],
		['"+42"', 'integer'],
		['"2147483647"', 'int'],
		['"32767"', 'short'],
		['"9223372036854775807"', 'long'],
		['"-1"', 'negativeInteger'],
		['"0"', 'nonNegativeInteger'],
		['"0"', 'nonPositiveInteger'],
		['"1"', 'positiveInteger'],
		['"255"', 'unsignedByte'],
		['"3.14"', 'decimal'],
		['"1.5E3"', 'double'],
		['"-INF"', 'float'],
		['"2024-02-29"', 'date'],
		['"2024-01-15+02:00"', 'date'],
		['"2024-01-15T10:30:00Z"', 'dateTime'],
		['"10:30:00Z"', 'time'],
		['"10:30:00+02:00"', 'time'],
		['"P1Y2M3DT4H5M6S"', 'duration'],
		['"2024"', 'gYear'],
		['"deadBEEF"', 'hexBinary'],
		['"3q2+7w=="', 'base64Binary'],
		['"https://example.org/a"', 'anyURI'],
		['"anything"', 'string']
	])('accepts %s as xsd:%s', (literal, localName) => {
		expect(lint(literal, localName)).toHaveLength(0);
	});

	it.each([
		['"yes"', 'boolean', 'true, false, 1 or 0'],
		['"12abc"', 'integer', '[+|-]digits'],
		['"1.5"', 'integer', '[+|-]digits'],
		['"2147483648"', 'int', 'from -2147483648 to 2147483647'],
		['"-2147483649"', 'int', 'from -2147483648 to 2147483647'],
		['"40000"', 'short', 'from -32768 to 32767'],
		['"0"', 'negativeInteger', 'below 0'],
		['"-1"', 'nonNegativeInteger', '0 or more'],
		['"1"', 'nonPositiveInteger', '0 or less'],
		['"0"', 'positiveInteger', 'above 0'],
		['"-1"', 'unsignedInt', 'from 0 to 4294967295'],
		['"3.14abc"', 'decimal', '[+|-]digits[.digits]'],
		['"1,5"', 'double', 'INF, -INF or NaN'],
		['"x2024-01-15"', 'date', 'YYYY-MM-DD'],
		['"2024-13-01"', 'date', 'YYYY-MM-DD'],
		['"2023-02-29"', 'date', 'a day its month has'],
		['"2024-04-31T10:00:00"', 'dateTime', 'a day its month has'],
		['"2024-01-15T10:30"', 'dateTime', 'YYYY-MM-DDThh:mm:ss'],
		['"10:30"', 'time', 'hh:mm:ss'],
		['"1Y"', 'duration', 'PnYnMnDTnHnMnS'],
		['"abc"', 'hexBinary', 'pairs of hexadecimal digits'],
		['"xyz!"', 'base64Binary', 'Base64'],
		['"abc"', 'base64Binary', 'Base64'],
		['"https://example.org/a b"', 'anyURI', 'without white space']
	])('warns about %s as xsd:%s, expecting %s', (literal, localName, expected) => {
		const diagnostics = lint(literal, localName);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
		expect(diagnostics[0].message).toContain(`xsd:${localName}`);
		expect(diagnostics[0].message).toContain(expected);
	});

	it('names a datatype it has no expected text for without one', () => {
		expect(lint('"two words  "', 'token')[0].message).toBe('The value is not a valid xsd:token.');
	});

	it('marks the literal, quotes included', () => {
		expect(lint('"yes"', 'boolean')[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 5 } });
	});

	it('resolves a prefixed datatype', () => {
		const tokens = typedLiteralTokens('"yes"', { name: 'PNAME_LN', image: 'xsd:boolean' });

		expect(lintTokens(tokens, { xsd: XSD_NAMESPACE })).toHaveLength(1);
	});

	it('reads the text of long and single-quoted literals', () => {
		expect(lint('"""true"""', 'boolean', 'STRING_LITERAL_LONG_QUOTE')).toHaveLength(0);
		expect(lint("'42'", 'integer', 'STRING_LITERAL_SINGLE_QUOTE')).toHaveLength(0);
		expect(lint("'''x'''", 'integer', 'STRING_LITERAL_LONG_SINGLE_QUOTE')).toHaveLength(1);
	});

	it('leaves datatypes of other vocabularies and undeclared prefixes alone', () => {
		expect(lintTokens(typedLiteralTokens('"anything"', { name: 'IRIREF', image: '<http://example.org/myType>' }))).toHaveLength(0);
		expect(lintTokens(typedLiteralTokens('"yes"', { name: 'PNAME_LN', image: 'xsd:boolean' }))).toHaveLength(0);
	});

	it('leaves a ^^ the parser reports alone: without a datatype after it, or without a string literal before it', () => {
		expect(lintTokens([makeToken('STRING_LITERAL_QUOTE', '"hello"', 0), makeToken('DCARET', '^^', 7)])).toHaveLength(0);
		expect(lintTokens([makeToken('DCARET', '^^', 0), makeToken('IRIREF', `<${XSD_NAMESPACE}integer>`, 2)])).toHaveLength(0);
		expect(lintTokens(typedLiteralTokens('ex:thing', { name: 'IRIREF', image: `<${XSD_NAMESPACE}integer>` }, 'PNAME_LN'))).toHaveLength(0);
	});

	it('returns no diagnostics without a ^^', () => {
		expect(lintTokens([makeToken('PNAME_LN', 'ex:Thing')])).toHaveLength(0);
	});
});
