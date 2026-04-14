import { XSD } from '@faubulous/mentor-rdf';
import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../linter-context';
import { Linter } from '../linter';
import { getIriFromToken, getUnquotedLiteralValue } from '@src/utilities';

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
export class XsdAnyUriLiteralLinter implements Linter {
	visitToken(context: LintDiagnosticsContext, token: IToken, index: number): Diagnostic[] {
		if (token.tokenType?.name !== RdfToken.DCARET.name || index < 1 || index >= context.tokens.length - 1) {
			return [];
		}

		const { document, tokens, prefixes } = context;
		const datatype = getIriFromToken(prefixes, tokens[index + 1]);

		if (datatype !== XSD.anyURI) {
			return [];
		}

		const valueToken = tokens[index - 1];
		const value = getUnquotedLiteralValue(valueToken);

		if (!/^https?:\/\//.test(value)) {
			return [];
		}

		return [{
			code: XSD_ANY_URI_LITERAL_CODE,
			severity: DiagnosticSeverity.Hint,
			message: `Use the IRI reference '<${value}>' instead of a typed string literal.`,
			source: 'Mentor',
			range: {
				start: document.positionAt(valueToken.startOffset),
				end: document.positionAt((tokens[index + 1].endOffset ?? tokens[index + 1].startOffset) + 1),
			}
		}];
	}
}
