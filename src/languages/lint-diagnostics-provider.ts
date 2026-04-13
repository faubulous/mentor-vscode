import { Diagnostic } from 'vscode-languageserver/browser';
import { LintDiagnosticsContext } from './lint-diagnostics-context';

/**
 * Interface for pluggable lint rules that produce diagnostics from parsed tokens.
 *
 * Implement this interface to add new lint checks to the language server
 * without modifying the core `getLintDiagnostics` method.
 */
export interface LintDiagnosticsProvider {
	/**
	 * Evaluate the rule against the given context and return any diagnostics.
	 */
	getDiagnostics(context: LintDiagnosticsContext): Diagnostic[];
}