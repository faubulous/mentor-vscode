import { XSD } from '@faubulous/mentor-rdf';
import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../linter-context';
import { Linter } from '../linter';
import { getIriFromToken, getUnquotedLiteralValue } from '@src/utilities';

/**
 * Validates XSD-typed literals against their declared datatype's lexical space.
 *
 * Operates on `DoubleCaret` tokens in the token stream and checks the preceding
 * literal value against the XSD datatype specified by the following token.
 */
export class XsdDatatypeValidationLinter implements Linter {
	visitToken(context: LintDiagnosticsContext, token: IToken, index: number): Diagnostic[] {
		if (token.tokenType?.name !== RdfToken.DCARET.name) {
			return [];
		}

		const { document, tokens, prefixes } = context;

		if (index > (tokens.length - 2)) {
			// We do not flag a linter error because this is a
			// syntax error which should be covered by the parser.
			return [];
		}

		const result: Diagnostic[] = [];
		const value = tokens[index - 1];
		const datatype = getIriFromToken(prefixes, tokens[index + 1]);

		switch (datatype) {
			case XSD.anyURI: {
				// See: https://www.w3.org/TR/xmlschema-2/#anyURI
				const regex = /(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the valid lexical space: [scheme:]scheme-specific-part[#fragment]",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.base64Binary: {
				// See: https://www.w3.org/TR/xmlschema-2/#hexBinary
				const regex = /[0-9a-fA-F]+/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the valid lexical space: [0-9a-fA-F]+",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.boolean: {
				// See: https://www.w3.org/TR/xmlschema-2/#boolean
				const v = getUnquotedLiteralValue(value);

				if (v !== 'true' && v !== 'false') {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid boolean: true or false.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.byte: {
				// See: https://www.w3.org/TR/xmlschema-2/#byte
				const regex = /-?0*[0-9]+/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the valid lexical space: [-]0*[0-9]+",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.date: {
				// See: https://www.w3.org/TR/xmlschema-2/#date
				const regex = /(-)?\d{4}-\d{2}-\d{2}(Z|[+-]\d{2}:\d{2})?$/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the valid lexical space: [-]YYYY-MM-DD[Z|(+|-)hh:mm]",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.dateTime: {
				// See: https://www.w3.org/TR/xmlschema-2/#dateTime
				const regex = /-?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the valid the lexical space: [-]YYYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm]",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.decimal: {
				// See: https://www.w3.org/TR/xmlschema-2/#decimal
				const n = parseFloat(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid decimal.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.double: {
				// See: https://www.w3.org/TR/xmlschema-2/#double
				const n = parseFloat(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid double.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.duration: {
				// See: https://www.w3.org/TR/xmlschema-2/#duration
				const regex = /(-)?P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the valid lexical space: PnYnMnDTnHnMnS",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.float: {
				// See: https://www.w3.org/TR/xmlschema-2/#float
				const n = parseFloat(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid float.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.int: {
				// See: https://www.w3.org/TR/xmlschema-2/#int
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid integer.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n < -2147483648 || n > 2147483647) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: [-2147483648, 2147483647]",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.integer: {
				// See: https://www.w3.org/TR/xmlschema-2/#integer
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid integer.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.long: {
				// See: https://www.w3.org/TR/xmlschema-2/#long
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid long.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n < -9223372036854775808 || n > 9223372036854775807) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: [-9223372036854775808, 9223372036854775807]",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.negativeInteger: {
				// See: https://www.w3.org/TR/xmlschema-2/#negativeInteger
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid negative integer.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n >= 0) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: < 0",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.nonNegativeInteger: {
				// See: https://www.w3.org/TR/xmlschema-2/#nonNegativeInteger
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid non-negative integer.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n < 0) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: >= 0",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.nonPositiveInteger: {
				// See: https://www.w3.org/TR/xmlschema-2/#nonPositiveInteger
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid non-positive integer.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n > 0) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: <= 0",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.positiveInteger: {
				// See: https://www.w3.org/TR/xmlschema-2/#positiveInteger
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid positive integer.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n <= 0) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: > 0",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.short: {
				// See: https://www.w3.org/TR/xmlschema-2/#short
				const n = parseInt(getUnquotedLiteralValue(value));

				if (isNaN(n)) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is not a valid short.",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}

				if (n < -32768 || n > 32767) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside the allowed value space: [-32768, 32767]",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
			case XSD.time: {
				// See: https://www.w3.org/TR/xmlschema-2/#time
				const regex = /\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})/;

				if (!regex.test(getUnquotedLiteralValue(value))) {
					result.push({
						severity: DiagnosticSeverity.Warning,
						message: "The value is outside valid the lexical space: hh:mm:ss[Z|(+|-)hh:mm].",
						range: {
							start: document.positionAt(value.startOffset),
							end: document.positionAt((value.endOffset ?? 0) + 1)
						}
					});
				}
				break;
			}
		}

		return result;
	}
}
