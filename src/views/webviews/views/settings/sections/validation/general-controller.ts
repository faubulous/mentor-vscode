import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';
import { ValidationStatsView } from './general-messages';

const SECTION_ID = 'validation.general' satisfies SettingsSectionId;

/**
 * Section controller for the Validation > General settings section. Surfaces
 * the last batch validation run's statistics (validated/skipped files, issue
 * count, duration) to the dashboard and proxies the show-log / validate actions
 * to the corresponding Mentor commands. Mirrors the indexing section controller.
 */
export class ValidationGeneralSectionController implements SettingsSectionController {
	readonly id: SettingsSectionId = SECTION_ID;

	private _post: (message: SettingsSectionMessages) => void = () => { };

	private _disposables: vscode.Disposable[] = [];

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		this._disposables.push(
			validationService.onDidFinishValidation(() => {
				this._post({ section: SECTION_ID, id: 'ValidationStatsChanged', stats: this._composeStats() });
			})
		);
	}

	async handleMessage(message: SettingsSectionMessages): Promise<boolean> {
		switch (message.id) {
			case 'GetValidationStats': {
				this._post({ section: SECTION_ID, id: 'ValidationStatsResult', stats: this._composeStats() });

				return true;
			}
			case 'ShowValidationLog': {
				await vscode.commands.executeCommand('mentor.command.showValidationLog');

				return true;
			}
			case 'ValidateWorkspace': {
				// The onDidFinishValidation subscription pushes refreshed stats once the run completes.
				await vscode.commands.executeCommand('mentor.command.validateAllProfiles');

				return true;
			}
			default: {
				return false;
			}
		}
	}

	/**
	 * Builds the current statistics view from the validation service's last run.
	 */
	private _composeStats(): ValidationStatsView {
		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		const statistics = validationService.lastRunStatistics
			?? { validatedFiles: 0, skippedFiles: 0, errorCount: 0, warningCount: 0, durationMs: 0 };

		return {
			...statistics,
			isValidating: validationService.isValidating,
			hasWorkspace: (vscode.workspace.workspaceFolders?.length ?? 0) > 0,
		};
	}

	dispose(): void {
		for (const d of this._disposables) {
			d.dispose();
		}

		this._disposables = [];
	}
}
