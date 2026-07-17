import * as vscode from 'vscode';

/**
 * Owns the dedicated validation status bar item, which sits directly after the
 * indexer item (-10001) and before the SPARQL connection item (-10003).
 *
 * The item has four states: hidden (no run yet), running (spinner text;
 * clicking triggers the cancel-confirmation command), configuration error
 * (broken profile references detected by the health check; clicking opens the
 * profile settings) and summary (the outcome of the last batch run, mirroring
 * the indexer's persistent summary; clicking opens the validation dashboard in
 * the settings). While idle, a configuration error takes precedence over the
 * run summary. Runs that finish without producing a summary — single-file and
 * on-change validations — restore the idle state instead of clearing it.
 */
export class ShaclValidationPresenter implements vscode.Disposable {
	private readonly _statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10002);

	/**
	 * The summary of the last finished batch run, restored after transient
	 * single-file runs.
	 */
	private _summary?: { text: string; tooltip: string };

	/**
	 * The tooltip of the pending configuration error, or `undefined` when the
	 * last health check found the validation profiles healthy.
	 */
	private _configurationErrorTooltip?: string;

	/**
	 * Whether a run is currently reflected on the item; idle-state updates
	 * (summary, configuration error) must not clobber the spinner.
	 */
	private _isRunning = false;

	constructor() {
		// The item is hidden until the first run starts or an error is reported.
		this._statusBarItem.hide();
	}

	/**
	 * Shows the status bar item with the given spinner text. While running,
	 * clicking the item triggers the cancel-confirmation command.
	 */
	showRunning(text: string): void {
		this._isRunning = true;

		this._statusBarItem.text = text;
		this._statusBarItem.tooltip = 'Click to cancel SHACL validation';
		this._statusBarItem.command = 'mentor.command.cancelValidation';
		this._statusBarItem.show();
	}

	/**
	 * Stores a persistent summary of a finished batch run and shows the idle state.
	 */
	showSummary(text: string, tooltip: string): void {
		this._isRunning = false;
		this._summary = { text, tooltip };

		this._renderIdle();
	}

	/**
	 * Ends a run that has no summary of its own (single-file and on-change
	 * validations): restores the idle state, or hides the item when there is
	 * nothing to show.
	 */
	clearRunning(): void {
		this._isRunning = false;

		this._renderIdle();
	}

	/**
	 * Reports the outcome of the profile health check: a tooltip describing the
	 * broken references, or `undefined` when the configuration is healthy. The
	 * error is shown as soon as the item is idle and cleared again once a check
	 * passes.
	 */
	setConfigurationError(tooltip: string | undefined): void {
		this._configurationErrorTooltip = tooltip;

		if (!this._isRunning) {
			this._renderIdle();
		}
	}

	/**
	 * Renders the idle state: a pending configuration error wins over the last
	 * run summary; without either, the item is hidden.
	 */
	private _renderIdle(): void {
		if (this._configurationErrorTooltip !== undefined) {
			this._statusBarItem.text = '$(warning) Configuration error';
			this._statusBarItem.tooltip = this._configurationErrorTooltip;
			this._statusBarItem.command = {
				title: 'Manage Profiles',
				command: 'mentor.command.openSettings',
				arguments: ['validation.profiles'],
			};
			this._statusBarItem.show();
		} else if (this._summary) {
			this._statusBarItem.text = this._summary.text;
			this._statusBarItem.tooltip = this._summary.tooltip;
			this._statusBarItem.command = {
				title: 'Open Validation Dashboard',
				command: 'mentor.command.openSettings',
				arguments: ['validation.general'],
			};
			this._statusBarItem.show();
		} else {
			this._statusBarItem.hide();
		}
	}

	dispose(): void {
		this._statusBarItem.dispose();
	}
}
