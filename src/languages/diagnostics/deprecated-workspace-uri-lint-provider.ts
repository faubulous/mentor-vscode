import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../lint-diagnostics-context';
import { LintDiagnosticsProvider } from '../lint-diagnostics-provider';
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
export class DeprecatedWorkspaceUriLintProvider implements LintDiagnosticsProvider {
	getDiagnostics(context: LintDiagnosticsContext): Diagnostic[] {
		const result: Diagnostic[] = [];
		const { document, tokens } = context;

		for (const t of tokens) {
			if (t.tokenType?.name !== RdfToken.IRIREF.name) {
				continue;
			}

			const iri = getIriFromIriReference(t.image);

			if (!DEPRECATED_URI_REGEX.test(iri)) {
				continue;
			}

			const canonical = iri.replace(/^workspace:\/(?!\/)/, 'workspace:///');

			result.push({
				code: DEPRECATED_WORKSPACE_URI_CODE,
				severity: DiagnosticSeverity.Warning,
				message: `Deprecated workspace URI scheme. Use '${canonical}' instead.`,
				source: 'Mentor',
				range: {
					start: document.positionAt(t.startOffset),
					end: document.positionAt((t.endOffset ?? t.startOffset) + 1),
				}
			});
		}

		return result;
	}
}
