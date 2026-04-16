import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

/**
 * Provides SHACL validation CodeLens actions at the top of RDF documents.
 */
export class TurtleValidationCodeLensProvider implements vscode.CodeLensProvider {
	private _initialized: boolean = false;

	private _initializing: boolean = false;

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
			if (e.affectsConfiguration('mentor.shacl')) {
				this._onDidChangeCodeLenses.fire();
			}
		});
	}

	private async _initialize() {
		this._initializing = true;
		this._initialized = false;

		this._workspaceIndexerService.waitForIndexed().then(() => {
			this._onDidChangeCodeLenses.fire();
		});

		this._contextService.onDidChangeDocumentContext(() => {
			this._onDidChangeCodeLenses.fire();
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

			const context = this._contextService.contexts[document.uri.toString()];

			if (!context) {
				return resolve([]);
			}

			const range = new vscode.Range(0, 0, 0, 0);
			const result: vscode.CodeLens[] = [];

			const shapeFiles = this._validationService.getEffectiveShapeGraphs(document.uri);
			const shapeCount = shapeFiles.length;

			let title = "";

			if (shapeCount > 1) {
				title += `$(check-all)\u00A0${shapeCount} shape sources`;
			} else if (shapeCount === 1) {
				title += `$(check-all)\u00A0${shapeCount} shape source`;
			} else {
				title += `$(check-all)\u00A0No shape sources`;
			}

			result.push(new vscode.CodeLens(range, {
				title: title,
				command: 'mentor.command.manageShaclShapes',
				tooltip: shapeCount > 0
					? `Configured SHACL shapes: ${shapeFiles.join(', ')}`
					: 'Configure SHACL shape files for this document'
			}));

			if (shapeCount > 0) {
				result.push(new vscode.CodeLens(range, {
					title: 'Validate',
					command: 'mentor.command.validateDocument',
					tooltip: 'Validate this document against configured SHACL shapes'
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
