/**
 * The validation statistics surfaced to the webview dashboard: the outcome of
 * the most recent batch validation run plus the current validation state.
 */
export interface ValidationStatsView {
	/**
	 * The number of files validated in the last run.
	 */
	validatedFiles: number;

	/**
	 * The number of matched files skipped in the last run because their data
	 * graph exceeded `mentor.shacl.maxGraphSize`.
	 */
	skippedFiles: number;

	/**
	 * The number of error-severity results (`sh:Violation`) summed across all
	 * files validated in the last run.
	 */
	errorCount: number;

	/**
	 * The number of warning-severity results (`sh:Warning`) summed across all
	 * files validated in the last run.
	 */
	warningCount: number;

	/**
	 * The wall-clock duration of the last run in milliseconds.
	 */
	durationMs: number;

	/**
	 * Whether a batch validation run is currently in progress.
	 */
	isValidating: boolean;

	/**
	 * Whether a workspace is open. Without a workspace there is nothing to
	 * validate and the validate action is disabled.
	 */
	hasWorkspace: boolean;
}

/**
 * Messages exchanged between the Validation > General settings section and its
 * host controller.
 */
export type ValidationGeneralMessages =
	| { id: 'GetValidationStats' }
	| { id: 'ValidationStatsResult'; stats: ValidationStatsView }
	| { id: 'ValidationStatsChanged'; stats: ValidationStatsView }
	| { id: 'ShowValidationLog' }
	| { id: 'ValidateWorkspace' };
