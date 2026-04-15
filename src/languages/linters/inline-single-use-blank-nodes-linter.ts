import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../linter-context';
import { Linter } from '../linter';

/**
 * The diagnostic code for single-use blank nodes that can be inlined.
 */
export const INLINE_SINGLE_USE_BLANK_NODE_CODE = 'InlineSingleUseBlankNode';

/**
 * Detects named blank nodes (e.g. `_:b0`) that are defined as subjects with a single
 * object-position reference, and therefore can be inlined into a blank node property
 * list `[ ... ]`.
 *
 * A blank node is considered single-use when it appears exactly twice in the token
 * stream — once as a subject (preceded by `.`) and once as an object reference.
 * This matches the same condition used by the document context's `references` map.
 */
export class InlineSingleUseBlankNodesLinter implements Linter {
	visitToken(_context: LintDiagnosticsContext, _token: IToken, _index: number): Diagnostic[] {
		return [];
	}

	finalize(context: LintDiagnosticsContext): Diagnostic[] {
		const { document, tokens } = context;

		// Group all BLANK_NODE_LABEL tokens by label value, tracking their index.
		const occurrences = new Map<string, { token: IToken; index: number }[]>();

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.tokenType?.name !== RdfToken.BLANK_NODE_LABEL.name) {
				continue;
			}

			const label = token.image;
			const list = occurrences.get(label);
			const entry = { token, index: i };

			if (list) {
				list.push(entry);
			} else {
				occurrences.set(label, [entry]);
			}
		}

		const diagnostics: Diagnostic[] = [];

		for (const [label, entries] of occurrences) {
			// A single-use blank node appears exactly twice in the token stream:
			// once as the subject definition and once as the object reference.
			// This matches the same condition used by the document context's references map.
			if (entries.length !== 2) {
				continue;
			}

			// Find the subject definition: the occurrence preceded by a PERIOD token
			// (mirroring the _registerSubject logic in turtle-document.ts).
			const subjectEntry = entries.find(({ index }) => {
				for (let j = index - 1; j >= 0; j--) {
					if (tokens[j].tokenType?.name === RdfToken.COMMENT.name) {
						continue;
					}

					return tokens[j].tokenType?.name === RdfToken.PERIOD.name;
				}

				// First token in the document with no preceding non-comment token — treat as subject.
				return true;
			});

			if (!subjectEntry) {
				continue;
			}

			const { token } = subjectEntry;

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
