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
