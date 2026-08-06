import * as vscode from 'vscode';
import { SH, Store } from '@faubulous/mentor-rdf';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getConfig } from '@src/utilities/vscode/config';
import { createYieldBudget } from '@src/utilities/scheduling';
import { ShaclValidationResult } from './shacl-validator-engine';
import { ShaclValidationPresenter } from './shacl-validation-presenter';

/**
 * Summary of a batch validation run over a set of workspace files.
 */
export interface ProfileValidationSummary {
	/**
	 * Number of files matched by the validated profile(s).
	 */
	matched: number;
	/**
	 * Number of matched files that were actually validated (i.e. had a loaded context).
	 */
	validated: number;
	/**
	 * Total number of validation issues across all validated files.
	 */
	issues: number;
	/**
	 * Number of error-severity results (`sh:Violation`) across all validated files.
	 */
	errors: number;
	/**
	 * Number of warning-severity results (`sh:Warning`) across all validated files.
	 */
	warnings: number;
	/**
	 * The validated files that had at least one issue.
	 */
	issueFiles: vscode.Uri[];
	/**
	 * Whether any shape graphs were available to validate against.
	 */
	hasShapes: boolean;
	/**
	 * Number of matched files skipped because their data graph exceeded the
	 * `mentor.shacl.maxGraphSize` limit.
	 */
	skipped: number;
	/**
	 * Whether the run stopped early because its cancellation token was triggered.
	 */
	cancelled?: boolean;
}

/**
 * Summary statistics of the most recent batch validation run, surfaced on the
 * validation dashboard in the settings panel.
 */
export interface ValidationRunStatistics {
	/**
	 * The number of files that were validated.
	 */
	validatedFiles: number;

	/**
	 * The number of matched files skipped because their data graph exceeded
	 * `mentor.shacl.maxGraphSize`.
	 */
	skippedFiles: number;

	/**
	 * The number of error-severity results (`sh:Violation`) summed across all
	 * validated files.
	 */
	errorCount: number;

	/**
	 * The number of warning-severity results (`sh:Warning`) summed across all
	 * validated files.
	 */
	warningCount: number;

	/**
	 * The wall-clock duration of the run in milliseconds.
	 */
	durationMs: number;
}

/**
 * Optional controls for a batch validation run. Progress and cancellation are owned
 * by the runner itself (surfaced on the validation status bar item), so callers only
 * choose whether the large-graph guard applies.
 */
export interface BatchValidationOptions {
	/**
	 * Whether to skip data graphs larger than `mentor.shacl.maxGraphSize`. Defaults to
	 * `true` for automatic runs (startup batch); explicit user-invoked commands pass
	 * `false` to validate every matched file regardless of size.
	 */
	skipLargeGraphs?: boolean;
}

/**
 * Internal controls threaded into the per-file batch loop.
 */
interface MatchingFilesOptions {
	/**
	 * Cancellation token checked between files; when triggered the batch stops early.
	 */
	token?: vscode.CancellationToken;
	/**
	 * Whether to skip data graphs larger than `mentor.shacl.maxGraphSize`.
	 */
	skipLargeGraphs?: boolean;
	/**
	 * Called after each processed file with the running completed count and the total
	 * number of files that will be processed, for status bar progress.
	 */
	onProgress?: (completed: number, total: number) => void;
}

/**
 * The collaborators a {@link ShaclBatchRunner} drives a batch run through.
 */
export interface ShaclBatchRunnerDependencies {
	/**
	 * Provides the loaded document contexts of the workspace files.
	 */
	contextService: IDocumentContextService;
	/**
	 * The store holding the combined data graphs (for the size guard).
	 */
	store: Store;
	/**
	 * The "Mentor Validation" log channel for per-file and summary messages.
	 */
	log: vscode.LogOutputChannel;
	/**
	 * Drives the validation status bar item (progress + spinner).
	 */
	presenter: ShaclValidationPresenter;
	/**
	 * Validates one document and publishes its diagnostics; supplied by the
	 * validation service.
	 */
	validateAndPublish: (uri: vscode.Uri, context: IDocumentContext, shapeGraphUris: string[]) => Promise<ShaclValidationResult>;
	/**
	 * Called once when the outermost batch finishes, so the service can fire a
	 * single coalesced `onDidValidate` event instead of one per file.
	 */
	onBatchEnd: () => void;
	/**
	 * Called when a matched file is skipped because its data graph exceeds
	 * `mentor.shacl.maxGraphSize`, so the service can record the skip for UI
	 * surfaces such as the validation code lens.
	 */
	onFileSkipped: (uri: vscode.Uri, triples: number, maxGraphSize: number) => void;
}

/**
 * Runs batch validations over sets of workspace files: drives the validation
 * status bar item (progress + summary), the "Mentor Validation" log, the
 * cancellation token that the status bar item / cancel command trigger and the
 * per-batch coalescing of `onDidValidate` events.
 */
export class ShaclBatchRunner {
	/**
	 * The cancellation source of the batch validation run currently in flight, or
	 * `undefined` when no batch is running. Triggered by {@link cancel}.
	 */
	private _activeCancellation?: vscode.CancellationTokenSource;

	/**
	 * Depth of nested batch runs. While greater than zero, per-file `onDidValidate`
	 * events are suppressed and coalesced into a single event fired when the outermost
	 * batch finishes — validating every file individually would otherwise trigger the
	 * definition tree / decoration / code-lens listeners once per file.
	 */
	private _batchDepth = 0;

	/**
	 * Summary statistics of the most recent finished batch run.
	 */
	private _statistics?: ValidationRunStatistics;

	constructor(private readonly _deps: ShaclBatchRunnerDependencies) { }

	/**
	 * Summary statistics of the most recent finished batch run, or `undefined`
	 * when no batch has run yet in this session.
	 */
	get statistics(): ValidationRunStatistics | undefined {
		return this._statistics;
	}

	/**
	 * Whether a batch validation run is currently in flight (and therefore cancellable).
	 */
	get isValidating(): boolean {
		return this._activeCancellation !== undefined;
	}

	/**
	 * Whether a batch is currently running, in which case per-file `onDidValidate`
	 * events are suppressed in favor of the coalesced end-of-batch event.
	 */
	get isBatchActive(): boolean {
		return this._batchDepth > 0;
	}

	/**
	 * Cancels the batch validation run currently in flight, if any. Invoked (after an
	 * explicit confirmation) by the `mentor.command.cancelValidation` command that the
	 * status bar item triggers.
	 */
	cancel(): void {
		this._activeCancellation?.cancel();
	}

	/**
	 * The configured maximum data-graph size (in triples) for automatic validation,
	 * or `0` when the guard is disabled. See `mentor.shacl.maxGraphSize`.
	 */
	getMaxGraphSize(): number {
		const value = getConfig('shacl').get<number>('maxGraphSize', 50000);

		return Number.isFinite(value) && value > 0 ? value : 0;
	}

	/**
	 * The number of triples in a document's combined data graph, counted from the
	 * store's indexes (no re-parse), so this is cheap even for large graphs.
	 */
	getDataGraphSize(context: IDocumentContext): number {
		return this._deps.store.getDataset(context.graphs, false).size;
	}

	/**
	 * Whether a document's combined data graph exceeds the given size limit. A limit
	 * of `0` disables the guard.
	 */
	exceedsGraphSizeLimit(context: IDocumentContext, maxGraphSize: number): boolean {
		return maxGraphSize > 0 && this.getDataGraphSize(context) > maxGraphSize;
	}

	/**
	 * Runs a batch validation over the matched files. A newly started batch cancels
	 * any batch still in flight.
	 */
	async run(
		label: string,
		files: ReadonlyArray<vscode.Uri>,
		hasShapes: boolean,
		selectShapes: (uri: vscode.Uri) => string[] | undefined,
		options?: BatchValidationOptions
	): Promise<ProfileValidationSummary> {
		this._activeCancellation?.cancel();
		this._activeCancellation?.dispose();

		const cancellation = new vscode.CancellationTokenSource();
		this._activeCancellation = cancellation;

		this._deps.presenter.showRunning('$(sync~spin) Validating…');
		this._deps.log.info(`-- Started validating ${label}...`);

		const startTime = performance.now();

		// Suppress per-file onDidValidate events for the duration of the batch and fire a
		// single coalesced event at the end, so the tree/decoration/code-lens listeners
		// refresh once instead of once per file.
		this._batchDepth++;

		let summary: ProfileValidationSummary | undefined;

		try {
			summary = await this._validateMatchingFiles(files, hasShapes, selectShapes, {
				token: cancellation.token,
				skipLargeGraphs: options?.skipLargeGraphs,
				onProgress: (completed, total) => this._deps.presenter.showRunning(`$(sync~spin) Validating: ${completed} of ${total} files...`),
			});

			const duration = Math.round(performance.now() - startTime);

			this._statistics = {
				validatedFiles: summary.validated,
				skippedFiles: summary.skipped,
				errorCount: summary.errors,
				warningCount: summary.warnings,
				durationMs: duration,
			};

			this._deps.log.info(
				`Validated ${summary.validated} of ${summary.matched} files in ${duration} ms`
				+ (summary.skipped > 0 ? `; ${summary.skipped} skipped` : '')
				+ (summary.cancelled ? ' (cancelled)' : '')
			);

			this._deps.log.info(`-- Ended ${label} validation.`);

			return summary;
		} finally {
			cancellation.dispose();

			if (this._activeCancellation === cancellation) {
				this._activeCancellation = undefined;
			}

			this._batchDepth--;

			if (this._batchDepth === 0) {
				// Leave a persistent summary of the outcome on the status bar, mirroring
				// the indexer's "Indexed N files" summary. On a failure, just end the
				// running state.
				if (summary) {
					this._showSummary(summary);
				} else {
					this._deps.presenter.clearRunning();
				}

				// Coalesced refresh: notify once so the tree, decorations and code lenses
				// rebuild a single time for the whole batch instead of per file.
				this._deps.onBatchEnd();
			}
		}
	}

	/**
	 * Shows the persistent status bar summary of a finished batch run.
	 */
	private _showSummary(summary: ProfileValidationSummary): void {
		const text = `$(checklist) Validated ${summary.validated} files`
			+ (summary.skipped > 0 ? `; ${summary.skipped} skipped` : '')
			+ (summary.cancelled ? ' (cancelled)' : '');

		const tooltip = `SHACL validation: ${summary.matched} files matched by profiles, `
			+ `${summary.validated} validated, ${summary.skipped} skipped`
			+ (summary.cancelled ? ' (run cancelled)' : '') + '.'
			+ '\nClick to open the validation dashboard.';

		this._deps.presenter.showSummary(text, tooltip);
	}

	/**
	 * Validates the files for which `selectShapes` returns a non-empty shape graph
	 * list, aggregating the outcome. Matched files without a loaded context are
	 * counted but skipped (no diagnostics). The matched-and-loaded files are resolved
	 * up front so progress can report an accurate `n of total`.
	 */
	private async _validateMatchingFiles(
		files: ReadonlyArray<vscode.Uri>,
		hasShapes: boolean,
		selectShapes: (uri: vscode.Uri) => string[] | undefined,
		options?: MatchingFilesOptions
	): Promise<ProfileValidationSummary> {
		let matched = 0;
		let validated = 0;
		let issues = 0;
		let errors = 0;
		let warnings = 0;
		let skipped = 0;
		let cancelled = false;
		const issueFiles: vscode.Uri[] = [];

		const maxGraphSize = options?.skipLargeGraphs === false ? 0 : this.getMaxGraphSize();

		// Resolve the files that actually carry work (matched by a profile and with a loaded
		// context) so the progress denominator is exact. Matched-but-unloaded files are still
		// counted in `matched` but never processed, mirroring how the indexer skips files.
		const workItems: { uri: vscode.Uri; shapes: string[] }[] = [];

		for (const uri of files) {
			const shapes = selectShapes(uri);

			if (!shapes || shapes.length === 0) {
				continue;
			}

			matched++;

			if (this._deps.contextService.contexts[uri.toString()]) {
				workItems.push({ uri, shapes });
			} else {
				// Matched by a profile but never validated because it has no loaded context
				// (e.g. not indexed). Log it so the output accounts for every matched file.
				this._deps.log.info(`Skipped ${uri.toString()}: no document context (not indexed).`);
			}
		}

		const total = workItems.length;

		// `shacl-engine`'s validate() is a CPU-bound loop that only yields microtasks, so a
		// tight batch would starve the extension-host event loop (frozen status bar, webviews
		// and trees). The budget yields a macrotask between files whenever enough wall-clock
		// time has elapsed, letting VS Code paint and process queued work.
		const yieldBudget = createYieldBudget();
		let completed = 0;

		for (const { uri, shapes } of workItems) {
			if (options?.token?.isCancellationRequested) {
				cancelled = true;
				break;
			}

			const context = this._deps.contextService.contexts[uri.toString()];

			if (!context) {
				continue;
			}

			// Skip pathologically large data graphs (e.g. imported vocabularies): validating
			// them can take many seconds each and is rarely intended automatically. Explicit
			// single-document validation (validateDocument) never reaches this loop, and the
			// user-invoked profile commands opt out via `skipLargeGraphs: false` (maxGraphSize 0).
			const triples = maxGraphSize > 0 ? this.getDataGraphSize(context) : 0;

			if (maxGraphSize > 0 && triples > maxGraphSize) {
				skipped++;
				completed++;
				options?.onProgress?.(completed, total);
				this._deps.log.info(`Skipped ${uri.toString()}: data graph exceeds mentor.shacl.maxGraphSize (${maxGraphSize}).`);
				this._deps.onFileSkipped(uri, triples, maxGraphSize);
				continue;
			}

			await yieldBudget.maybeYield();

			try {
				const result = await this._deps.validateAndPublish(uri, context, shapes);

				validated++;

				// Count every published result so the reported total matches the Problems
				// panel. A file can conform (no sh:Violation) yet still publish Warning/Info
				// diagnostics, which must be counted as issues too.
				if (result.results.length > 0) {
					issueFiles.push(uri);
					issues += result.results.length;

					for (const entry of result.results) {
						if (entry.severity === SH.Violation) {
							errors++;
						} else if (entry.severity === SH.Warning) {
							warnings++;
						}
					}
				}
			} catch (error) {
				this._deps.log.error(`SHACL validation failed for ${uri.toString()}: ${error}`);
			}

			completed++;
			options?.onProgress?.(completed, total);
		}

		return { matched, validated, issues, errors, warnings, issueFiles, hasShapes, skipped, cancelled };
	}
}
