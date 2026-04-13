import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../linter-context';
import { Linter } from '../linter';
import { getIriFromIriReference } from '@src/utilities';

/**
 * The diagnostic code for deprecated `workspace:/path` URIs.
 */
export const DEPRECATED_WORKSPACE_URI_CODE = 'DeprecatedWorkspaceUri';

/**
 * Matches the deprecated `workspace:/path` format (single slash) but NOT the
 * canonical `workspace:///path` format (triple slash).
 */
const DEPRECATED_URI_REGEX = /^workspace:\/(?!\/)/;

/**
 * Detects deprecated `workspace:/path` URIs in IRIREF tokens and suggests
 * replacing them with `workspace:///path`.
 */
export class DeprecatedWorkspaceUriLinter implements Linter {
	visitToken(context: LintDiagnosticsContext, token: IToken, _index: number): Diagnostic[] {
		if (token.tokenType?.name !== RdfToken.IRIREF.name) {
			return [];
		}

		const iri = getIriFromIriReference(token.image);

		if (!DEPRECATED_URI_REGEX.test(iri)) {
			return [];
		}

		const canonical = iri.replace(/^workspace:\/(?!\/)/, 'workspace:///');

		return [{
			code: DEPRECATED_WORKSPACE_URI_CODE,
			severity: DiagnosticSeverity.Warning,
			message: `Deprecated workspace URI scheme. Use '${canonical}' instead.`,
			source: 'Mentor',
			range: {
				start: context.document.positionAt(token.startOffset),
				end: context.document.positionAt((token.endOffset ?? token.startOffset) + 1),
			}
		}];
	}
}
