import * as vscode from 'vscode';
import { IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { getProfileDisplayName, isGlobPattern } from '@src/services/validation/shacl-validation-configuration';
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

			// Notebook cells carry their cell-id slug CodeLens on line 0 and run validation
			// via the native cell play button (see NotebookController). VS Code clips
			// overflowing CodeLenses (and renders this last-registered slug provider
			// rightmost), so in cells we keep only the shape-source/configuration lens and
			// drop the Validate execute button (the play button covers it) and the status
			// lens (the result shows as the cell's execution output) to leave room for the
			// slug.
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

			// When a shape source is configured, the Validate action leads the group;
			// the shape-configuration lens follows it. Suppressed in notebook cells (play button).
			if (shapeCount > 0 && !isCell) {
				result.push(new vscode.CodeLens(range, {
					title: '$(run-coverage)\u00A0Validate',
					command: 'mentor.command.validateDocument',
					tooltip: 'Validate this document against configured SHACL shape files'
				}));
			}

			result.push(new vscode.CodeLens(range, {
				title: title,
				command: 'mentor.command.manageShaclShapes',
				tooltip: tooltip
			}));

			// Show status from last validation, if available. Suppressed in notebook cells —
			// the result is shown as the cell's execution output instead.
			const lastResult = isCell ? undefined : this._validationService.getLastResult(document.uri);

			if (lastResult) {
				const statusTitle = lastResult.conforms
					? '$(pass)\u00A0Conforms'
					: `$(error)\u00A0${lastResult.results.length} issue(s)`;

				result.push(new vscode.CodeLens(range, {
					title: statusTitle,
					command: 'mentor.command.viewShaclReport',
					tooltip: 'View the SHACL validation report'
				}));
			}

			return resolve(result);
		});
	}
}
