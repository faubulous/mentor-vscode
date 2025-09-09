import * as vscode from 'vscode';

/**
 * Helper class for generating and parsing Mentor inference graph URIs.
 */
export class InferenceUri {
	static readonly queryAppendix = `inference`;

	/**
	 * A regular expression to match Mentor inference graph URIs in text documents.
	 * @note This is intentionally a string so that any modifiers for the evaluation can be easily applied as needed.
	 */
	static readonly uriRegex = `(<[^\\s>]+>)${this.queryAppendix}$`;

	/**
	 * Checks if a URI is an inference graph URI.
	 * @param uri The URI to check.
	 * @returns True if the URI is an inference graph URI, false otherwise.
	 */
	static isInferenceUri(uri: string | vscode.Uri): boolean {
		const u = typeof uri === "string" ? uri : uri.toString(true);

		return u.endsWith(this.queryAppendix);
	}

	/**
	 * Converts any URI (https://..) to a inference graph URI.
	 * @param originalUri The URI to convert.
	 * @returns The corresponding Mentor inference graph URI.
	 */
	static toInferenceUri(originalUri: string | vscode.Uri): string {
		// Note: Append the inferenceGraphFragment to any existing fragment id or we create a new one. The reasoning 
		// is that when sorting or prefixing IRIs the inference graph will be at the end and sorted after the 
		// original IRI and existing prefixes will still work.
		const u = typeof originalUri === "string" ? originalUri : originalUri.toString(true);
		const n = u.indexOf('?');

		// If there is no fragment id, then append one.
		const inferenceUri = n > -1 ? u + '&' : u + '?';

		return inferenceUri + this.queryAppendix;
	}

	/**
	 * Restore a Mentor inference graph URI to the original URI.
	 * @param inferenceUri A Mentor inference graph URI.
	 * @returns The inference URI without the inference graph appendix if present, otherwise the unmodified argument.
	 */
	static toUri(inferenceUri: string): string {
		if (this.isInferenceUri(inferenceUri)) {
			return inferenceUri.substring(0, inferenceUri.length - this.queryAppendix.length - 1);
		} else {
			return inferenceUri;
		}
	}
}