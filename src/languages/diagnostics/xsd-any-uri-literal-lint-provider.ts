import { XSD } from '@faubulous/mentor-rdf';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../lint-diagnostics-context';
import { LintDiagnosticsProvider } from '../lint-diagnostics-provider';
import { getIriFromToken } from '@src/utilities';

/**
 * The diagnostic code for xsd:anyURI string literals that should be IRI references.
 */
export const XSD_ANY_URI_LITERAL_CODE = 'XsdAnyUriLiteral';

/**
 * Detects `"http(s)://..."^^xsd:anyURI` typed literals and suggests replacing them
 * with IRI references `<http(s)://...>`.
 *
 * This rule operates on the already-parsed token stream (specifically `DoubleCaret` tokens)
 * rather than running a regex over the raw text, reusing the same token iteration that
 * the language server performs for XSD datatype validation.
 */
export class XsdAnyUriLiteralLintProvider implements LintDiagnosticsProvider {
	getDiagnostics(context: LintDiagnosticsContext): Diagnostic[] {
		const result: Diagnostic[] = [];
		const { document, tokens, prefixes } = context;

		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];

			if (t.tokenType?.name !== 'DoubleCaret' || i < 1 || i >= tokens.length - 1) {
				continue;
			}

			const datatype = getIriFromToken(prefixes, tokens[i + 1]);

			if (datatype !== XSD.anyURI) {
				continue;
			}

			const valueToken = tokens[i - 1];
			const value = this._getUnquotedLiteralValue(valueToken);

			if (!/^https?:\/\//.test(value)) {
				continue;
			}

			result.push({
				code: XSD_ANY_URI_LITERAL_CODE,
				severity: DiagnosticSeverity.Hint,
				message: `Use the IRI reference '<${value}>' instead of a typed string literal.`,
				source: 'Mentor',
				range: {
					start: document.positionAt(valueToken.startOffset),
					end: document.positionAt((tokens[i + 1].endOffset ?? tokens[i + 1].startOffset) + 1),
				}
			});
		}

		return result;
	}

	private _getUnquotedLiteralValue(token: import('@faubulous/mentor-rdf-parsers').IToken): string {
		switch (token?.tokenType.name) {
			case RdfToken.STRING_LITERAL_QUOTE.name:
			case RdfToken.STRING_LITERAL_SINGLE_QUOTE.name:
				return token.image.substring(1, token.image.length - 1);
			case RdfToken.STRING_LITERAL_LONG_QUOTE.name:
			case RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name:
				return token.image.substring(3, token.image.length - 3);
		}

		return token.image;
	}
}
