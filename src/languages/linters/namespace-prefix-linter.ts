import { IToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from '../linter-context';
import { Linter } from '../linter';
import { getNamespaceDefinition } from '@src/utilities';

/**
 * The diagnostic code for duplicate namespace prefix declarations.
 */
export const DUPLICATE_PREFIX_CODE = 'DuplicatePrefix';

/**
 * The diagnostic code for invalid namespace URI declarations.
 */
export const INVALID_NAMESPACE_URI_CODE = 'InvalidNamespaceUri';

/**
 * The diagnostic code for unused namespace prefix declarations.
 */
export const UNUSED_NAMESPACE_PREFIX_CODE = 'UnusedNamespacePrefixHint';

/**
 * Detects duplicate prefix declarations, invalid namespace URIs, and unused prefixes.
 */
export class NamespacePrefixLinter implements Linter {
	private _seenPrefixes: Record<string, boolean> = {};
	private _usedPrefixes = new Set<string>();

	reset(): void {
		this._seenPrefixes = {};
		this._usedPrefixes = new Set();
	}

	visitToken(context: LintDiagnosticsContext, token: IToken, index: number): Diagnostic[] {
		const type = token.tokenType?.name;

		if (!type || type === 'Unknown') {
			return [];
		}

		const { document, tokens } = context;
		const result: Diagnostic[] = [];

		switch (type) {
			case 'PREFIX':
			case 'TTL_PREFIX': {
				const ns = getNamespaceDefinition(tokens, token);

				if (ns) {
					if (this._seenPrefixes[ns.prefix]) {
						const n = token.startLine ? token.startLine - 1 : 0;

						result.push({
							code: DUPLICATE_PREFIX_CODE,
							severity: DiagnosticSeverity.Warning,
							message: `The prefix '${ns.prefix}' is already defined.`,
							range: {
								start: { line: n, character: 0 },
								end: { line: n, character: Number.MAX_SAFE_INTEGER },
							}
						});
					}

					this._seenPrefixes[ns.prefix] = true;

					const u = tokens[index + 2];

					if (ns.uri === '') {
						result.push({
							code: INVALID_NAMESPACE_URI_CODE,
							severity: DiagnosticSeverity.Error,
							message: `Invalid namespace URI.`,
							range: {
								start: document.positionAt(u.startOffset),
								end: document.positionAt(u.endOffset ?? 0)
							}
						});
					} else if (!ns.uri.endsWith('/') && !ns.uri.endsWith('#') && !ns.uri.endsWith('_') && !ns.uri.endsWith('=') && !ns.uri.endsWith(':')) {
						result.push({
							severity: DiagnosticSeverity.Warning,
							message: `An RDF namespace URI should end with a '/', '#', '_', '=' or ':' character.`,
							range: {
								start: document.positionAt(u.startOffset),
								end: document.positionAt(u.endOffset ?? 0)
							}
						});
					}
				}

				break;
			}
			case 'PNAME_NS': {
				const prefix = token.image.split(':')[0];
				const previousType = tokens[index - 1]?.tokenType?.name;

				if (previousType !== 'PREFIX' && previousType !== 'TTL_PREFIX') {
					this._usedPrefixes.add(prefix);
				}

				break;
			}
			case 'PNAME_LN': {
				const prefix = token.image.split(':')[0];

				this._usedPrefixes.add(prefix);

				break;
			}
		}

		return result;
	}

	finalize(context: LintDiagnosticsContext): Diagnostic[] {
		const result: Diagnostic[] = [];
		const { tokens } = context;

		for (const prefix of Object.keys(this._seenPrefixes)) {
			if (!this._usedPrefixes.has(prefix)) {
				const prefixToken = tokens.find(t => t.image === `${prefix}:`);

				if (prefixToken) {
					const n = prefixToken.startLine ? prefixToken.startLine - 1 : 0;

					result.push({
						code: UNUSED_NAMESPACE_PREFIX_CODE,
						severity: DiagnosticSeverity.Hint,
						tags: [DiagnosticTag.Unnecessary],
						message: `Prefix '${prefix}' is declared but never used.`,
						range: {
							start: { line: n, character: 0 },
							end: { line: n, character: Number.MAX_SAFE_INTEGER },
						}
					});
				}
			}
		}

		return result;
	}
}
