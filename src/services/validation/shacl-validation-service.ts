import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { IDocumentContextService, IDocumentFactory } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getConfig } from '@src/utilities/vscode/config';
import { toUniqueStringArray } from '@src/utilities/array';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { ShaclDiagnosticsMapper } from './shacl-diagnostics-mapper';
import {
	getDocumentValidationState,
	matchesProfilePaths,
	profilePathEntries,
	resolveEffectiveShapeGraphs,
	ShaclBrokenReferences,
	ShaclDocumentLocation,
	ShaclDocumentValidationState,
	ShaclValidationSettings,
} from './shacl-validation-configuration';
import { ShaclProfileSettingsService } from './shacl-profile-settings-service';
import { ShaclSettingsSyncService } from './shacl-settings-sync-service';
import { ShaclValidationResult, ShaclValidatorEngine } from './shacl-validator-engine';
import { formatReportAsText, serializeReportAsTurtle } from './shacl-report-exporter';
import { ShaclValidationPresenter } from './shacl-validation-presenter';
import { BatchValidationOptions, ProfileValidationSummary, ShaclBatchRunner, ValidationRunStatistics } from './shacl-batch-runner';

export type { ShaclValidationResult, ShaclValidationResultEntry } from './shacl-validator-engine';
export type { BatchValidationOptions, ProfileValidationSummary, ValidationRunStatistics } from './shacl-batch-runner';

/**
 * The facade for SHACL validation of RDF documents: resolves the profiles that
 * apply to a document, runs single-document and batch validations through the
 * {@link ShaclValidatorEngine} and {@link ShaclBatchRunner}, publishes the
 * resulting diagnostics and notifies consumers via {@link onDidValidate}.
 */
export class ShaclValidationService implements vscode.Disposable {
	private readonly _diagnosticCollection: vscode.DiagnosticCollection;
	private readonly _diagnosticsMapper: ShaclDiagnosticsMapper;
	private readonly _disposables: vscode.Disposable[] = [];

	/**
	 * Stores the last validation result per document URI for report export.
	 */
	private readonly _lastResults = new Map<string, ShaclValidationResult>();

	/**
	 * Documents whose automatic validation was skipped because their data graph
	 * exceeds `mentor.shacl.maxGraphSize`, keyed by document URI. Surfaced by the
	 * validation code lens; cleared when the document is validated, edited or closed.
	 */
	private readonly _lastSkips = new Map<string, { triples: number; maxGraphSize: number }>();

	/**
	 * Tracks in-flight validation runs per document and shape graph combination
	 * so that concurrent triggers share a single validation.
	 */
	private readonly _inflightValidations = new Map<string, Promise<ShaclValidationResult | undefined>>();

	private readonly _onDidValidate = new vscode.EventEmitter<vscode.Uri>();

	private readonly _onDidFinishValidation = new vscode.EventEmitter<void>();

	/**
	 * Log channel for validation activity, mirroring the "Mentor Indexer" channel.
	 * Records per-file validation timings and batch summaries.
	 */
	private readonly _log: vscode.LogOutputChannel = vscode.window.createOutputChannel('Mentor Validation', { log: true });

	/**
	 * Drives the validation status bar item shown while a run is in flight.
	 */
	private readonly _presenter = new ShaclValidationPresenter();

	/**
	 * The vscode-free validation core (validator cache + result mapping).
	 */
	private readonly _engine: ShaclValidatorEngine;

	/**
	 * Runs batch validations (progress, cancellation, event coalescing).
	 */
	private readonly _batchRunner: ShaclBatchRunner;

	/**
	 * Keeps the validation settings in sync with the workspace (renames,
	 * deletions) and runs the startup health checks.
	 */
	readonly settingsSync: ShaclSettingsSyncService;

	/**
	 * Fired when a validation completes (or results are cleared) for a document.
	 */
	readonly onDidValidate: vscode.Event<vscode.Uri> = this._onDidValidate.event;

	/**
	 * Fired when a batch validation run finishes, after {@link lastRunStatistics}
	 * has been updated. Used by the validation dashboard to refresh its metrics.
	 */
	readonly onDidFinishValidation: vscode.Event<void> = this._onDidFinishValidation.event;

	constructor(
		context: vscode.ExtensionContext,
		private readonly _store: Store,
		private readonly _contextService: IDocumentContextService,
		private readonly _documentFactory: IDocumentFactory,
		private readonly _profileSettings: ShaclProfileSettingsService = new ShaclProfileSettingsService()
	) {
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('mentor-shacl');
		this._diagnosticsMapper = new ShaclDiagnosticsMapper();
		this._engine = new ShaclValidatorEngine(_store, message => this._log.info(message));
		this.settingsSync = new ShaclSettingsSyncService(_store, this._profileSettings, broken => {
			// Surface broken profile references on the status bar item; a passing
			// check clears the error again.
			const brokenProfiles = Object.keys(broken.profiles);

			this._presenter.setConfigurationError(brokenProfiles.length > 0
				? 'Some SHACL validation profiles reference missing shape graphs. '
				+ `Affected profiles: ${brokenProfiles.join(', ')}.`
				+ '\nClick to manage the validation profiles.'
				: undefined);
		});
		this._batchRunner = new ShaclBatchRunner({
			contextService: _contextService,
			store: _store,
			log: this._log,
			presenter: this._presenter,
			validateAndPublish: (uri, documentContext, shapes) => this._validateAndPublish(uri, documentContext, shapes),
			onBatchEnd: () => {
				// Coalesced refresh: fire once for the active document so the tree, decorations
				// and code lenses rebuild a single time for the whole batch instead of per file.
				const activeUri = this._contextService.activeContext?.uri;

				if (activeUri) {
					this._onDidValidate.fire(activeUri);
				}

				this._onDidFinishValidation.fire();
			},
			onFileSkipped: (uri, triples, maxGraphSize) => {
				this._lastSkips.set(uri.toString(), { triples, maxGraphSize });
			},
		});

		context.subscriptions.push(this);

		this._log.clear();

		this._disposables.push(this._log, this._presenter);

		// Clear diagnostics when a document is closed.
		this._disposables.push(
			vscode.workspace.onDidCloseTextDocument(doc => {
				this._diagnosticCollection.delete(doc.uri);
				this._lastResults.delete(doc.uri.toString());
				this._lastSkips.delete(doc.uri.toString());
				this._onDidValidate.fire(doc.uri);
			}),
			// Editing a document invalidates its last validation result and skip
			// state: drop them so the status CodeLens no longer reports a stale state.
			vscode.workspace.onDidChangeTextDocument(e => {
				const key = e.document.uri.toString();

				if (e.contentChanges.length === 0) {
					return;
				}

				const droppedResult = this._lastResults.delete(key);
				const droppedSkip = this._lastSkips.delete(key);

				if (droppedResult || droppedSkip) {
					this._onDidValidate.fire(e.document.uri);
				}
			}),
			// Auto-validate on change: a fresh document context is delivered after
			// the debounced re-parse (on open and on edit).
			this._contextService.onDidChangeDocumentContext(context => this._autoValidateOnChange(context))
		);
	}

	/**
	 * Validates a document against its matching profiles when `mentor.shacl.enabled`
	 * and `mentor.shacl.validateOnChange` are both on. Skips documents that are not
	 * covered by a profile or that currently have syntax errors, and never shows a
	 * notification (diagnostics are published quietly).
	 */
	private async _autoValidateOnChange(context: IDocumentContext | undefined): Promise<void> {
		if (!context) {
			return;
		}

		const shaclConfig = getConfig('shacl');

		if (!shaclConfig.get<boolean>('enabled', false) || !shaclConfig.get<boolean>('validateOnChange', false)) {
			return;
		}

		const shapeGraphUris = this.getEffectiveShapeGraphs(context.uri);

		if (shapeGraphUris.length === 0 || this._hasSyntaxErrors(context.uri)) {
			return;
		}

		// Never auto-validate a pathologically large data graph on change: it would block
		// the extension host on every edit. Explicit validation commands bypass this guard.
		const maxGraphSize = this._batchRunner.getMaxGraphSize();
		const triples = maxGraphSize > 0 ? this._batchRunner.getDataGraphSize(context) : 0;

		if (maxGraphSize > 0 && triples > maxGraphSize) {
			this._log.info(`Skipped on-change validation for ${context.uri.toString()}: data graph exceeds mentor.shacl.maxGraphSize.`);
			this._lastSkips.set(context.uri.toString(), { triples, maxGraphSize });
			this._onDidValidate.fire(context.uri);
			return;
		}

		// Reflect the run on the status bar item unless a batch already owns it.
		const ownsStatusBar = !this._batchRunner.isValidating;

		if (ownsStatusBar) {
			const fileName = context.uri.path.split('/').pop() ?? context.uri.toString();
			this._presenter.showRunning(`$(sync~spin) Validating ${fileName}...`);
		}

		try {
			await this._validateAndPublish(context.uri, context, shapeGraphUris);
		} catch (error) {
			this._log.error(`SHACL auto-validation failed for ${context.uri.toString()}: ${error}`);
		} finally {
			if (ownsStatusBar) {
				this._presenter.clearRunning();
			}
		}
	}

	/**
	 * Whether the document currently has blocking syntax errors: any error-severity
	 * diagnostic that is not a SHACL result (SHACL diagnostics carry `source: 'SHACL'`).
	 */
	private _hasSyntaxErrors(uri: vscode.Uri): boolean {
		return vscode.languages.getDiagnostics(uri).some(diagnostic =>
			diagnostic.severity === vscode.DiagnosticSeverity.Error && diagnostic.source !== 'SHACL');
	}

	/**
	 * Get the current SHACL validation settings, merging profiles across the
	 * user and workspace scopes (workspace overrides user on an id conflict).
	 * See {@link ShaclProfileSettingsService.getMergedSettings}.
	 */
	getValidationSettings(): ShaclValidationSettings {
		return this._profileSettings.getMergedSettings();
	}

	/**
	 * Get the workspace-relative location of a document, as matched against the
	 * profiles's include/exclude entries. Documents outside the workspace get
	 * an inert location (their full URI as the path) that nothing matches.
	 */
	getDocumentLocation(documentUri: vscode.Uri): ShaclDocumentLocation {
		const wsUri = WorkspaceUri.toWorkspaceUri(documentUri);

		if (!wsUri) {
			return { path: documentUri.toString() };
		}

		return {
			path: wsUri.relativePath,
			fragment: wsUri.fragment || undefined,
		};
	}

	/**
	 * Get the currently-recognized RDF file extensions (e.g. `.ttl`), used to
	 * narrow extension-less include/exclude patterns to RDF files.
	 */
	getRdfExtensions(): string[] {
		return Object.entries(this._documentFactory.supportedExtensions)
			.filter(([, info]) => info.isTripleSource)
			.map(([extension]) => extension);
	}

	/**
	 * Get the effective shape graph URIs for a given document.
	 */
	getEffectiveShapeGraphs(documentUri: vscode.Uri): string[] {
		return resolveEffectiveShapeGraphs(this.getValidationSettings(), this.getDocumentLocation(documentUri), this.getRdfExtensions());
	}

	/**
	 * Get the fully-resolved validation state of a document, including the
	 * applied profile ids, for UI purposes such as code lenses.
	 */
	getDocumentValidationState(documentUri: vscode.Uri): ShaclDocumentValidationState {
		return getDocumentValidationState(this.getValidationSettings(), this.getDocumentLocation(documentUri), this.getRdfExtensions());
	}

	/**
	 * Validate a document against the specified shape files.
	 * @param documentUri The URI of the document to validate.
	 * @param shapeFileUris Workspace-relative paths to SHACL shape files. If empty, effective shapes are used.
	 * @returns The validation result or undefined if no shapes are available.
	 */
	async validateDocument(documentUri: vscode.Uri, shapeFileUris?: string[]): Promise<ShaclValidationResult | undefined> {
		const context = this._contextService.contexts[documentUri.toString()];

		if (!context) {
			vscode.window.showInformationMessage('No document context available. Please open the document first.');
			return undefined;
		}

		const shapeGraphUris = shapeFileUris?.length ? shapeFileUris : this.getEffectiveShapeGraphs(documentUri);

		if (shapeGraphUris.length === 0) {
			vscode.window.showInformationMessage('No SHACL shape files configured for this document.');
			return undefined;
		}

		for (const graphUri of shapeGraphUris) {
			if (!this._store.hasGraph(graphUri)) {
				vscode.window.showWarningMessage(`Shape graph does not exist: ${graphUri}`);
			}
		}

		// Share a single validation run between concurrent triggers for the same
		// document and shape graph combination.
		const inflightKey = documentUri.toString() + '\n' + [...shapeGraphUris].sort().join('\n');
		const inflight = this._inflightValidations.get(inflightKey);

		if (inflight) {
			return inflight;
		}

		const validation = this._runValidation(documentUri, context, shapeGraphUris);

		this._inflightValidations.set(inflightKey, validation);

		try {
			return await validation;
		} finally {
			this._inflightValidations.delete(inflightKey);
		}
	}

	/**
	 * Validates every workspace file matched by the given profile against that
	 * profile's shape graphs, publishing diagnostics for each. Files without a
	 * loaded context (e.g. not yet indexed) are skipped.
	 * @param profileId The id of the profile to validate.
	 * @param files The workspace files to consider.
	 */
	async validateProfile(profileId: string, files: ReadonlyArray<vscode.Uri>, options?: BatchValidationOptions): Promise<ProfileValidationSummary> {
		const profile = this.getValidationSettings().profiles?.[profileId];

		if (!profile) {
			return { matched: 0, validated: 0, issues: 0, errors: 0, warnings: 0, issueFiles: [], hasShapes: false, skipped: 0 };
		}

		const shapes = toUniqueStringArray(profile.shapes);
		const entries = profilePathEntries(profile);
		const rdfExtensions = this.getRdfExtensions();

		return this._batchRunner.run(`profile "${profileId}"`, files, shapes.length > 0, uri =>
			matchesProfilePaths(entries, this.getDocumentLocation(uri), rdfExtensions) ? shapes : undefined,
			options
		);
	}

	/**
	 * Validates every workspace file matched by any profile against its effective
	 * shape graphs (the union of all matching profiles), publishing diagnostics
	 * for each. Files without a loaded context are skipped.
	 * @param files The workspace files to consider.
	 */
	async validateAllProfiles(files: ReadonlyArray<vscode.Uri>, options?: BatchValidationOptions): Promise<ProfileValidationSummary> {
		const hasProfiles = Object.keys(this.getValidationSettings().profiles ?? {}).length > 0;

		return this._batchRunner.run('workspace', files, hasProfiles, uri => {
			const shapes = this.getEffectiveShapeGraphs(uri);

			return shapes.length > 0 ? shapes : undefined;
		}, options);
	}

	/**
	 * Whether a batch validation run is currently in flight (and therefore cancellable).
	 */
	get isValidating(): boolean {
		return this._batchRunner.isValidating;
	}

	/**
	 * Summary statistics of the most recent batch validation run, or `undefined`
	 * when no batch has run yet in this session.
	 */
	get lastRunStatistics(): ValidationRunStatistics | undefined {
		return this._batchRunner.statistics;
	}

	/**
	 * Reveals the "Mentor Validation" log output channel.
	 */
	showLog(): void {
		this._log.show();
	}

	/**
	 * Cancels the batch validation run currently in flight, if any. Invoked (after an
	 * explicit confirmation) by the `mentor.command.cancelValidation` command that the
	 * status bar item triggers.
	 */
	cancelActiveValidation(): void {
		this._batchRunner.cancel();
	}

	/**
	 * Runs a single-document validation while reflecting it on the status bar item
	 * and reporting failures with an error notification.
	 */
	private async _runValidation(documentUri: vscode.Uri, context: IDocumentContext, shapeGraphUris: string[]): Promise<ShaclValidationResult | undefined> {
		const fileName = documentUri.path.split('/').pop() ?? documentUri.toString();

		// Reflect the single-file run on the dedicated status bar item (no snackbar); it is
		// hidden again afterwards. Batch runs manage their own status text.
		this._presenter.showRunning(`$(sync~spin) Validating ${fileName}...`);

		// Yield once so VS Code can paint the status bar spinner before validation starts.
		await new Promise(resolve => setTimeout(resolve, 0));

		try {
			return await this._validateAndPublish(documentUri, context, shapeGraphUris);
		} catch (error) {
			this._log.error(`SHACL validation failed for ${documentUri.toString()}: ${error}`);
			vscode.window.showErrorMessage(`SHACL validation failed: ${error}`);
			return undefined;
		} finally {
			this._presenter.clearRunning();
		}
	}

	/**
	 * Validates a document's data against the given shape graphs and publishes the
	 * resulting diagnostics. Unlike {@link _runValidation} this shows no status bar
	 * message, so it is suitable for batch validation of many files.
	 */
	private async _validateAndPublish(documentUri: vscode.Uri, context: IDocumentContext, shapeGraphUris: string[]): Promise<ShaclValidationResult> {
		// A read-only view over the store — no triple copying needed.
		const dataDataset = this._store.getDataset(context.graphs, false);

		// Time only the data-graph validation here; shape compilation is timed separately
		// by the engine. Logging both makes it easy to tell whether a slow "small" file is
		// paying for its own validation or for a one-off validator build.
		const startTime = performance.now();
		const result = await this._engine.validate(shapeGraphUris, dataDataset);
		const duration = Math.round(performance.now() - startTime);

		this._log.info(`Validated ${documentUri.toString()}: ${duration}ms, ${dataDataset.size} triples, ${result.results.length} issues`);

		this._lastResults.set(documentUri.toString(), result);
		this._lastSkips.delete(documentUri.toString());
		this._publishDiagnostics(documentUri, context, result);

		// During a batch the event is coalesced into a single fire when the batch ends
		// (see ShaclBatchRunner); firing per file would refresh the tree/decorations 48× over.
		if (!this._batchRunner.isBatchActive) {
			this._onDidValidate.fire(documentUri);
		}

		return result;
	}

	/**
	 * Get the last validation result for a document.
	 */
	getLastResult(documentUri: vscode.Uri): ShaclValidationResult | undefined {
		return this._lastResults.get(documentUri.toString());
	}

	/**
	 * Get the recorded skip of the last automatic validation run for a document:
	 * present when the document's data graph exceeded `mentor.shacl.maxGraphSize`
	 * and no validation has run since. Surfaced by the validation code lens.
	 */
	getLastSkip(documentUri: vscode.Uri): { triples: number; maxGraphSize: number } | undefined {
		return this._lastSkips.get(documentUri.toString());
	}

	/**
	 * Clear validation diagnostics for a document.
	 */
	clearDiagnostics(documentUri: vscode.Uri): void {
		this._diagnosticCollection.delete(documentUri);
		this._lastResults.delete(documentUri.toString());
		this._lastSkips.delete(documentUri.toString());
		this._onDidValidate.fire(documentUri);
	}

	/**
	 * Get the validation report as plain text.
	 */
	getReportAsText(documentUri: vscode.Uri): string | undefined {
		const result = this._lastResults.get(documentUri.toString());

		return result ? formatReportAsText(result) : undefined;
	}

	/**
	 * Get the validation report as a Turtle string.
	 */
	async getReportAsTurtle(documentUri: vscode.Uri): Promise<string | undefined> {
		const result = this._lastResults.get(documentUri.toString());

		if (!result || !result.reportDataset) {
			return undefined;
		}

		return serializeReportAsTurtle(result);
	}

	private _publishDiagnostics(documentUri: vscode.Uri, context: IDocumentContext, result: ShaclValidationResult): void {
		const diagnostics = this._diagnosticsMapper.mapToDiagnostics(result, context);
		this._diagnosticCollection.set(documentUri, diagnostics);
	}

	/**
	 * Checks all validation profiles for broken references. See
	 * {@link ShaclSettingsSyncService.checkShaclProfiles}.
	 */
	checkShaclProfiles(): Promise<ShaclBrokenReferences> {
		return this.settingsSync.checkShaclProfiles();
	}

	dispose(): void {
		this._diagnosticCollection.dispose();

		for (const d of this._disposables) {
			d.dispose();
		}
	}
}
