import { XSD } from '@faubulous/mentor-rdf';
import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { getIriFromToken, getUnquotedLiteralValue } from '@src/utilities';
import { LiteralDatatypes } from '@src/utilities/literal-datatypes';
import { LintingContext, LintingProvider } from '..';

/**
 * The tokens of the string literals a datatype can follow.
 */
const STRING_LITERAL_TOKENS: ReadonlySet<string> = new Set([
	RdfToken.STRING_LITERAL_QUOTE.name,
	RdfToken.STRING_LITERAL_SINGLE_QUOTE.name,
	RdfToken.STRING_LITERAL_LONG_QUOTE.name,
	RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name
]);

/**
 * The time zone a date or time may end with.
 */
const TIME_ZONE = '[Z|(+|-)hh:mm]';

/**
 * The text the XSD datatypes take, by their IRIs, which the warning on a value that does not fit
 * names; a datatype without one is warned about without it.
 */
const EXPECTED_TEXTS: ReadonlyMap<string, string> = new Map([
	[XSD.anyURI, 'a URI without white space'],
	[XSD.base64Binary, 'Base64 characters A-Z, a-z, 0-9, + and /, padded with ='],
	[XSD.boolean, 'true, false, 1 or 0'],
	[XSD.byte, 'an integer from -128 to 127'],
	[XSD.date, `[-]YYYY-MM-DD${TIME_ZONE} with a day its month has`],
	[XSD.dateTime, `[-]YYYY-MM-DDThh:mm:ss[.s]${TIME_ZONE} with a day its month has`],
	[XSD.decimal, '[+|-]digits[.digits]'],
	[XSD.double, '[+|-]digits[.digits][E[+|-]digits], INF, -INF or NaN'],
	[XSD.duration, '[-]PnYnMnDTnHnMnS'],
	[XSD.float, '[+|-]digits[.digits][E[+|-]digits], INF, -INF or NaN'],
	[XSD.gDay, `---DD${TIME_ZONE}`],
	[XSD.gMonth, `--MM${TIME_ZONE}`],
	[XSD.gMonthDay, `--MM-DD${TIME_ZONE}`],
	[XSD.gYear, `[-]YYYY${TIME_ZONE}`],
	[XSD.gYearMonth, `[-]YYYY-MM${TIME_ZONE}`],
	[XSD.hexBinary, 'pairs of hexadecimal digits'],
	[XSD.int, 'an integer from -2147483648 to 2147483647'],
	[XSD.integer, '[+|-]digits'],
	[XSD.long, 'an integer from -9223372036854775808 to 9223372036854775807'],
	[XSD.negativeInteger, 'an integer below 0'],
	[XSD.nonNegativeInteger, 'an integer of 0 or more'],
	[XSD.nonPositiveInteger, 'an integer of 0 or less'],
	[XSD.positiveInteger, 'an integer above 0'],
	[XSD.short, 'an integer from -32768 to 32767'],
	[XSD.time, `hh:mm:ss[.s]${TIME_ZONE}`],
	[XSD.unsignedByte, 'an integer from 0 to 255'],
	[XSD.unsignedInt, 'an integer from 0 to 4294967295'],
	[XSD.unsignedLong, 'an integer from 0 to 18446744073709551615'],
	[XSD.unsignedShort, 'an integer from 0 to 65535']
]);

/**
 * Validates XSD-typed literals against the lexical space and value range of their datatype, with
 * the checks the form editor and SHACL validation use ({@link LiteralDatatypes.fits}).
 *
 * Operates on `DoubleCaret` tokens in the token stream and checks the string literal before it
 * against the datatype after it.
 */
export class XsdDatatypeValidationLinter implements LintingProvider {
	visitToken(context: LintingContext, token: IToken, index: number): Diagnostic[] {
		// A `^^` without a literal before it or a datatype after it is a syntax error the parser reports.
		if (token.tokenType?.name !== RdfToken.DCARET.name || index < 1 || index > context.tokens.length - 2) {
			return [];
		}

		const { positionAt, tokens, prefixes } = context;
		const value = tokens[index - 1];
		const datatype = getIriFromToken(prefixes, tokens[index + 1]);

		if (!datatype || !STRING_LITERAL_TOKENS.has(value.tokenType?.name) || LiteralDatatypes.fits(datatype, getUnquotedLiteralValue(value))) {
			return [];
		}

		return [{
			severity: DiagnosticSeverity.Warning,
			message: _messageOf(datatype),
			range: {
				start: positionAt(value.startOffset),
				end: positionAt((value.endOffset ?? 0) + 1)
			}
		}];
	}
}

/**
 * The warning on a value that does not fit its XSD datatype, such as "The value is not a valid
 * xsd:boolean: expected true, false, 1 or 0."
 * @param datatype The IRI of the datatype.
 * @returns The message.
 */
function _messageOf(datatype: string): string {
	const name = `xsd:${datatype.slice(datatype.lastIndexOf('#') + 1)}`;
	const expected = EXPECTED_TEXTS.get(datatype);

	return expected ? `The value is not a valid ${name}: expected ${expected}.` : `The value is not a valid ${name}.`;
}
