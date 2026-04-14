import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../linter-context';
import { Linter } from '../linter';

/**
 * The diagnostic code for single-use blank nodes that can be inlined.
 */
export const INLINE_SINGLE_USE_BLANK_NODE_CODE = 'InlineSingleUseBlankNode';

/**
 * Detects named blank nodes (e.g. `_:b0`) that are used only once as a subject,
 * and therefore can be inlined into a blank node property list `[ ... ]`.
 *
 * Blank node subjects with a single occurrence in the token stream are reported as
 * hints, indicating the blank node can be inlined.
 */
export class InlineSingleUseBlankNodesLinter implements Linter {
	visitToken(_context: LintDiagnosticsContext, _token: IToken, _index: number): Diagnostic[] {
		return [];
	}

	finalize(context: LintDiagnosticsContext): Diagnostic[] {
		const { document, tokens } = context;

		// Group all BLANK_NODE_LABEL tokens by label value.
		const occurrences = new Map<string, IToken[]>();

		for (const token of tokens) {
			if (token.tokenType?.name !== RdfToken.BLANK_NODE_LABEL.name) {
				continue;
			}

			const label = token.image;
			const list = occurrences.get(label);

			if (list) {
				list.push(token);
			} else {
				occurrences.set(label, [token]);
			}
		}

		const diagnostics: Diagnostic[] = [];

		for (const [label, tokenList] of occurrences) {
			if (tokenList.length !== 1) {
				continue;
			}

			const token = tokenList[0];

			diagnostics.push({
				code: INLINE_SINGLE_USE_BLANK_NODE_CODE,
				severity: DiagnosticSeverity.Hint,
				message: `Single-use blank node '${label}' can be inlined.`,
				source: 'Mentor',
				range: {
					start: document.positionAt(token.startOffset),
					end: document.positionAt((token.endOffset ?? token.startOffset) + 1),
				},
			});
		}

		return diagnostics;
	}
}
