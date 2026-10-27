import * as vscode from 'vscode';

export type PrefixDiagnosticCode = 'UndefinedNamespacePrefixError' | 'UnusedNamespacePrefixHint' | string;

/**
 * Extract the prefix name from a line of text associated with an 'UnusedNamespacePrefixHint' diagnostic.
 * @param lineText The text to analyze.
 * @returns The extracted prefix name, or `undefined` if no prefix is found.
 */
function extractPrefixFromUnusedPrefixLine(lineText: string): string | undefined {
	// Range for unused prefix diagnostics is the whole line. Support both Turtle and SPARQL styles.
	// Examples:
	//   @prefix ex: <http://example/> .
	//   PREFIX ex: <http://example/>
	const match = lineText.match(/\b(?:@prefix|prefix|PREFIX)\s+([^\s:]+)\s*:/);

	return match?.[1];
}

/**
 * Extract prefixes from diagnostics emitted by the Mentor language server.
 * @param document The document associated with the diagnostics.
 * @param diagnostics The diagnostics to analyze.
 * @param errorCode The specific diagnostic code to filter by (e.g., 'UndefinedNamespacePrefixError').
 * @returns An array of prefix names associated with the specified diagnostic code.
 */
export function getPrefixesWithErrorCode(document: vscode.TextDocument, diagnostics: Iterable<vscode.Diagnostic>, errorCode: PrefixDiagnosticCode): string[] {
	const result = new Set<string>();

	for (const diagnostic of diagnostics) {
		if (diagnostic.code !== errorCode) {
			continue;
		}

		const text = document.getText(diagnostic.range);

		if (errorCode === 'UnusedNamespacePrefixHint') {
			const prefix = extractPrefixFromUnusedPrefixLine(text);

			if (prefix) {
				result.add(prefix);
			}

			continue;
		}

		// Default: assume diagnostic range includes a pname-like token.
		const prefix = text.split(':')[0];

		if (prefix) {
			result.add(prefix);
		}
	}

	return Array.from(result);
}

/**
 * Indicate whether a diagnostic was reported by SHACL validation.
 * @param diagnostic The diagnostic to inspect.
 * @returns `true` if the diagnostic originates from SHACL validation, `false` otherwise.
 */
function isShaclDiagnostic(diagnostic: vscode.Diagnostic): boolean {
	return typeof diagnostic.source === 'string'
		&& diagnostic.source.toLowerCase().includes('shacl');
}

/**
 * Indicate whether a document has errors that prevent it from being rewritten. SHACL
 * violations are excluded because they describe invalid data in a syntactically valid
 * document, which can still be parsed and serialized faithfully.
 * @param uri The URI of the document to inspect.
 * @returns `true` if the document has blocking errors, `false` otherwise.
 */
export function hasBlockingErrors(uri: vscode.Uri): boolean {
	return vscode.languages.getDiagnostics(uri).some(
		(diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error && !isShaclDiagnostic(diagnostic)
	);
}
