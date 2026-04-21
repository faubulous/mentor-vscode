import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
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

	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get _workspaceIndexerService() {
		return container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
	}

	private get _validationService() {
		return container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
	}

	constructor() {
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

			const range = new vscode.Range(0, 0, 0, 0);
			const result: vscode.CodeLens[] = [];

			const shapeFiles = this._validationService.getEffectiveShapeGraphs(document.uri);
			const shapeCount = shapeFiles.length;
			const shapeFilesTooltip = shapeCount > 0
				? `Configured SHACL shapes:\n\n${shapeFiles.map(shapeFile => `- ${shapeFile}`).join('\n')}`
				: 'Configure SHACL shape files for this document';

			let title = "";

			if (shapeCount > 1) {
				title += `$(file)\u00A0${shapeCount} shape files active`;
			} else if (shapeCount === 1) {
				title += `$(file)\u00A0${shapeCount} shape file active`;
			} else {
				title += `$(file)\u00A0No shape files active`;
			}

			result.push(new vscode.CodeLens(range, {
				title: title,
				command: 'mentor.command.manageShaclShapes',
				tooltip: shapeFilesTooltip
			}));

			if (shapeCount > 0) {
				result.push(new vscode.CodeLens(range, {
					title: '$(run-coverage)\u00A0Validate',
					command: 'mentor.command.validateDocument',
					tooltip: 'Validate this document against configured SHACL shape files'
				}));
			}

			// Show status from last validation, if available
			const lastResult = this._validationService.getLastResult(document.uri);

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
