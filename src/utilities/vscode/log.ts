import * as vscode from 'vscode';

let channel: vscode.LogOutputChannel | undefined;

/**
 * The shared "Mentor" log channel for general extension diagnostics.
 *
 * Logging convention:
 * - Output channel (`getLog()` or a feature channel like "Mentor Validation"):
 *   diagnostics a user or support case may need — failures that were handled,
 *   timings, skipped work. Never `console.*` in production code.
 * - `vscode.window.show*Message`: only for errors the user can act on.
 *
 * Created lazily on first use; the activation code pushes it onto the extension
 * subscriptions for disposal.
 */
export function getLog(): vscode.LogOutputChannel {
	channel ??= vscode.window.createOutputChannel('Mentor', { log: true });

	return channel;
}

/**
 * Formats a URI for a log message as `scheme://authority` followed by the *raw* `path`.
 *
 * `Uri.toString()`, `Uri.toString(true)` and `Uri.fsPath` all lowercase a Windows drive letter,
 * while `Uri.path` — the value workspace mapping actually compares — preserves it. Logging a
 * serialised URI therefore hides a drive-letter mismatch: a root and a file that failed to map
 * against it print as one being a literal prefix of the other, so a total mapping failure looks
 * impossible in the log. Path segments are left unencoded for the same reason: the logged text is
 * the string that was compared.
 * @param uri The URI to describe, or `undefined`.
 * @returns The log representation, or `<none>` when no URI is given.
 */
export function describeUriPath(uri: vscode.Uri | undefined): string {
	if (!uri) {
		return '<none>';
	}

	return `${uri.scheme}://${uri.authority}${uri.path}`;
}
