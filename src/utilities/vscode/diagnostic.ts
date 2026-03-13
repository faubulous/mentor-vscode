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
