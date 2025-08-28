/**
 * Helper class for working with Mentor inference graph URIs.
 * @note This is intentionally not using vscode.Uri classes so that it can 
 * be reused in LSP processes or webview components where vscode.Uri is not available.
 */
export class InferenceUri {
	static readonly baseUri = `vscode://faubulous.mentor/inference?uri=`;

	/**
	 * A regular expression to match Mentor inference graph URIs in text documents.
	 * @note This is intentionally a string so that any modifiers for the evaluation can be easily applied as needed.
	 */
	static readonly uriRegex = `${this.baseUri}[^\\s>]+`;

	/**
	 * Checks if a URI is an inference graph URI.
	 * @param uri The URI to check.
	 * @returns True if the URI is an inference graph URI, false otherwise.
	 */
	static isInferenceUri(uri: string): boolean {
		return uri.startsWith(this.baseUri);
	}

	/**
	 * Converts any URI (https://..) to a inference graph URI.
	 * @param uri The URI to convert.
	 * @returns The corresponding Mentor inference graph URI.
	 */
	static toInferenceUri(uri: string): string {
		return `${this.baseUri}${encodeURIComponent(uri)}`;
	}

	/**
	 * Resolves a workspace-relative URI into an absolute file system URI (file://..).
	 * @param workspaceUri The workspace-relative URI.
	 * @returns The absolute file URI.
	 */
	static toUri(inferenceUri: string): string {
		const uriComponent = inferenceUri.replace(this.baseUri, '').replace(/^<|>|\/$/g, '');
		
		return decodeURIComponent(uriComponent);
	}
}