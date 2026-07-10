import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { isLegacyShaclValidationConfig, migrateLegacyShaclValidationConfig } from '@src/services/validation/shacl-validation-migration';
import { ISettingsMigration } from '../settings-migration.interface';

const KEY = 'shacl.validation';

/**
 * Migrates the legacy `mentor.shacl.validation` value (`{ defaults, graphs }`)
 * to the profile-based model (`{ profiles, documents }`).
 *
 * Legacy values were written to the user (global) scope, which prevented sharing
 * them with a team. The migrated settings are written to the workspace scope and
 * the legacy global value is cleared afterwards. Since the old document keys are
 * workspace-relative, a global value shared across workspaces was ambiguous
 * anyway; entries from other workspaces become inert assignments that can be
 * removed in the validation settings UI.
 *
 * Idempotent: does nothing when the workspace value already uses the new model
 * and no legacy global value remains.
 */
export class ShaclValidationProfilesMigration implements ISettingsMigration {
	readonly id = 'shacl.validation.profiles';

	readonly description = 'Migrate the legacy SHACL validation configuration to named validation profiles in workspace settings.';

	async migrate(): Promise<void> {
		const config = getConfig();
		const info = config.inspect<unknown>(KEY);

		if (!info) {
			return;
		}

		const { workspaceValue, globalValue } = info;
		const canWriteWorkspace = !!vscode.workspace.workspaceFolders?.length;

		if (workspaceValue !== undefined && !isLegacyShaclValidationConfig(workspaceValue)) {
			// Already migrated — only clean up a leftover legacy global value.
			if (isLegacyShaclValidationConfig(globalValue)) {
				await config.update(KEY, undefined, vscode.ConfigurationTarget.Global);
			}

			return;
		}

		const legacy = isLegacyShaclValidationConfig(workspaceValue)
			? workspaceValue
			: isLegacyShaclValidationConfig(globalValue) ? globalValue : undefined;

		if (!legacy || !canWriteWorkspace) {
			return;
		}

		const migrated = migrateLegacyShaclValidationConfig(legacy);

		await config.update(KEY, migrated, vscode.ConfigurationTarget.Workspace);

		if (globalValue !== undefined) {
			await config.update(KEY, undefined, vscode.ConfigurationTarget.Global);
		}
	}
}
