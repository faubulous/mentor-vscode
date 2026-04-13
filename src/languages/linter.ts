import { IToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from './linter-context';

/**
 * @note This code is in the languages directory because the providers may not import vscode APIs.
 */

/**
 * Interface for pluggable lint rules that integrate into the language server's
 * single-pass token iteration.
 *
 * The language server calls `reset` once before iterating, `visitToken` for every
 * token (in order), and `finalize` once after the last token. Providers only need
 * to implement the methods relevant to them; `reset` and `finalize` are optional.
 */
export interface Linter {
	/**
	 * Called once before each document validation. Reset any per-document state here.
	 */
	reset?(): void;

	/**
	 * Called once per token in document order. Return any diagnostics triggered by
	 * this token. Use `context.tokens[index - 1]` / `context.tokens[index + 1]` for
	 * look-behind / look-ahead without re-iterating.
	 */
	visitToken(context: LintDiagnosticsContext, token: IToken, index: number): Diagnostic[];

	/**
	 * Called once after all tokens have been visited. Return diagnostics that require
	 * full-document context (e.g. unused-prefix hints that need all usages seen first).
	 */
	finalize?(context: LintDiagnosticsContext): Diagnostic[];
}