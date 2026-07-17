import * as vscode from 'vscode';

/**
 * Owns the dedicated validation status bar item, which sits alongside the
 * indexer/graph/SPARQL group (priorities -10000..-10002).
 *
 * The item has three states: hidden (no run yet), running (spinner text;
 * clicking triggers the cancel-confirmation command) and summary (the outcome
 * of the last batch run, mirroring the indexer's persistent summary). Runs
 * that finish without producing a summary — single-file and on-change
 * validations — restore the last batch summary instead of clearing it.
 */
export class ShaclValidationPresenter implements vscode.Disposable {
	private readonly _statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10003);

	/**
	 * The summary of the last finished batch run, restored after transient
	 * single-file runs.
	 */
	private _summary?: { text: string; tooltip: string };

	constructor() {
		// The item is hidden until the first run starts.
		this._statusBarItem.hide();
	}

	/**
	 * Shows the status bar item with the given spinner text. While running,
	 * clicking the item triggers the cancel-confirmation command.
	 */
	showRunning(text: string): void {
		this._statusBarItem.text = text;
		this._statusBarItem.tooltip = 'Click to cancel SHACL validation';
		this._statusBarItem.command = 'mentor.command.cancelValidation';
		this._statusBarItem.show();
	}

	/**
	 * Shows a persistent summary of a finished batch run. The cancel affordance
	 * is removed: there is nothing to cancel while idle.
	 */
	showSummary(text: string, tooltip: string): void {
		this._summary = { text, tooltip };

		this._statusBarItem.text = text;
		this._statusBarItem.tooltip = tooltip;
		this._statusBarItem.command = undefined;
		this._statusBarItem.show();
	}

	/**
	 * Ends a run that has no summary of its own (single-file and on-change
	 * validations): restores the last batch summary, or hides the item when no
	 * batch has run yet.
	 */
	clearRunning(): void {
		if (this._summary) {
			this.showSummary(this._summary.text, this._summary.tooltip);
		} else {
			this._statusBarItem.hide();
		}
	}

	dispose(): void {
		this._statusBarItem.dispose();
	}
}
