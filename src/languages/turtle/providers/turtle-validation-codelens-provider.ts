import * as vscode from 'vscode';
import { IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { isGlobPattern } from '@src/utilities/glob';
import { getProfileDisplayName } from '@src/services/validation/shacl-validation-configuration';
import { getConfig } from '@src/utilities/vscode/config';

/**
 * Provides SHACL validation CodeLens actions at the top of RDF documents.
 */
export class TurtleValidationCodeLensProvider implements vscode.CodeLensProvider {
	private _initialized: boolean = false;

	private _initializing: boolean = false;

	private _enabled: boolean = false;

	private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor(
		private readonly _contextService: IDocumentContextService,
		private readonly _workspaceIndexerService: IWorkspaceIndexerService,
		private readonly _validationService: ShaclValidationService
	) {
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.shacl') || e.affectsConfiguration('mentor.shacl.enabled')) {
				this._enabled = getConfig().get('shacl.enabled', false);
				this._onDidChangeCodeLenses.fire();
			}
		});
	}

	private async _initialize() {
		this._initializing = true;
		this._initialized = false;
		this._enabled = getConfig().get('shacl.enabled', false);

		this._workspaceIndexerService.waitForIndexed().then(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

		this._contextService.onDidChangeDocumentContext(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

		this._validationService.onDidValidate(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

		this._initialized = true;
		this._initializing = false;
	}

	provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
		return new Promise(async (resolve) => {
			if (this._initializing) {
				return resolve([]);
			}

			if (!this._initialized) {
				await this._initialize();
			}

			if (!this._enabled) {
				return resolve([]);
			}

			const context = this._contextService.contexts[document.uri.toString()];

			if (!context) {
				return resolve([]);
			}

			// Notebook cells carry their cell-id slug CodeLens on line 0 and can also be
			// validated via the native cell play button (see NotebookController). The
			// Validate button is shown in cells too, so the lens group stays consistent
			// with how it appears in a standalone editor. The status and skip lenses are
			// still dropped in cells — a cell's validation result is shown as its
			// execution output rather than as a status lens.
			const isCell = document.uri.scheme === 'vscode-notebook-cell';

			const range = new vscode.Range(0, 0, 0, 0);
			const result: vscode.CodeLens[] = [];

			const state = this._validationService.getDocumentValidationState(document.uri);
			const shapeCount = state.effectiveShapes.length;

			// Glob patterns that applied a profile are listed in the tooltip for
			// transparency; the title itself stays unqualified.
			const matchedPatterns = state.matchedPaths.filter(isGlobPattern);
			const matchedPatternsTooltip = matchedPatterns.length > 0
				? `\n\nMatched path patterns:\n\n${matchedPatterns.map(pattern => `- ${pattern}`).join('\n')}`
				: '';

			let title = '';
			let tooltip: string;

			if (state.profileNames.length > 0) {
				// The state holds stable profile ids; resolve them to display names.
				const settings = this._validationService.getValidationSettings();
				const displayNames = state.profileNames.map(id => getProfileDisplayName(settings, id));
				const names = displayNames.slice(0, 3).join(', ')
					+ (displayNames.length > 3 ? ` +${displayNames.length - 3}` : '');

				title = `$(checklist)\u00A0Validation: ${names}`;
				tooltip = `Applied validation profiles: ${displayNames.join(', ')}`
					+ (state.effectiveShapes.length > 0
						? `\n\nShape files:\n\n${state.effectiveShapes.map(shapeFile => `- ${shapeFile}`).join('\n')}`
						: '')
					+ matchedPatternsTooltip;
			} else {
				title = `$(checklist)\u00A0Validation: not configured`;
				tooltip = 'Configure SHACL validation for this document';
			}

			// Lens order: Validate, validation status, validation profiles. The connection
			// lens from TurtleConnectionCodeLensProvider renders last because that provider
			// is registered before this one (see TurtleTokenProvider.registerForLanguage).

			// When a shape source is configured, the Validate action leads the group.
			if (shapeCount > 0) {
				result.push(new vscode.CodeLens(range, {
					title: '$(run-coverage)\u00A0Validate',
					command: 'mentor.command.validateDocument',
					tooltip: 'Validate this document against configured SHACL shape files'
				}));
			}

			// Show status from last validation, if available. Suppressed in notebook cells —
			// the result is shown as the cell's execution output instead.
			const lastResult = isCell ? undefined : this._validationService.getLastResult(document.uri);

			if (lastResult) {
				// A run with missing shape graphs validated against less than the
				// profile promises — never present it as a clean pass.
				const missing = lastResult.missingShapeGraphs ?? [];

				const statusTitle = missing.length > 0
					? (lastResult.conforms
						? `$(warning)\u00A0Conforms (${missing.length} shape graph${missing.length === 1 ? '' : 's'} missing)`
						: `$(error)\u00A0${lastResult.results.length} issue(s) (${missing.length} shape graph${missing.length === 1 ? '' : 's'} missing)`)
					: (lastResult.conforms
						? '$(pass)\u00A0Conforms'
						: `$(error)\u00A0${lastResult.results.length} issue(s)`);

				const statusTooltip = missing.length > 0
					? 'The result may be incomplete — these configured shape graphs do not exist: '
					+ missing.join(', ')
					: 'View the SHACL validation report';

				result.push(new vscode.CodeLens(range, {
					title: statusTitle,
					command: 'mentor.command.viewShaclReport',
					tooltip: statusTooltip
				}));
			}

			// Surface a skipped automatic validation so silence is not mistaken for a
			// clean result. A validation result supersedes the skip, so both never show.
			const lastSkip = isCell || lastResult ? undefined : this._validationService.getLastSkip(document.uri);

			if (lastSkip) {
				result.push(new vscode.CodeLens(range, {
					title: '$(warning)\u00A0Validation skipped (size limit)',
					command: 'mentor.command.validateDocument',
					tooltip: `Automatic SHACL validation was skipped: the data graph (${lastSkip.triples} triples) `
						+ `exceeds mentor.shacl.maxGraphSize (${lastSkip.maxGraphSize}). Validate explicitly to bypass the limit.`
				}));
			}

			result.push(new vscode.CodeLens(range, {
				title: title,
				command: 'mentor.command.manageShaclShapes',
				tooltip: tooltip
			}));

			return resolve(result);
		});
	}
}
