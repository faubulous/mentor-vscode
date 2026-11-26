import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { ISettingsMigration } from '../settings-migration.interface';

/**
 * The settings of the form editor that no longer exist: the switch that turned it on, the default
 * view that kept the editor associations in step, and the performance log of its first versions.
 */
const REMOVED_KEYS: readonly string[] = ['formEditor.enabled', 'formEditor.defaultView', 'formEditor.logPerformance'];

/**
 * The scopes a removed setting may still be written in, with how to read its value there.
 */
const SCOPES: ReadonlyArray<{
	target: vscode.ConfigurationTarget;
	valueOf: (inspection: ReturnType<vscode.WorkspaceConfiguration['inspect']>) => unknown;
}> = [
	{ target: vscode.ConfigurationTarget.Global, valueOf: inspection => inspection?.globalValue },
	{ target: vscode.ConfigurationTarget.Workspace, valueOf: inspection => inspection?.workspaceValue },
	{ target: vscode.ConfigurationTarget.WorkspaceFolder, valueOf: inspection => inspection?.workspaceFolderValue }
];

/**
 * Remove the settings of the form editor that no longer exist from the scopes they are written in.
 * The form editor is always offered now, and whether it opens by default is VS Code's editor
 * association, which the user sets and Mentor leaves alone.
 */
export class FormEditorSettingsMigration implements ISettingsMigration {
	readonly id = 'formEditor.removedSettings';

	readonly description = 'Remove `formEditor.enabled`, `formEditor.defaultView` and `formEditor.logPerformance`, which no longer exist.';

	/**
	 * Remove every removed setting from each scope it is written in.
	 */
	async migrate(): Promise<void> {
		const config = getConfig();

		for (const key of REMOVED_KEYS) {
			const inspection = config.inspect(key);

			for (const scope of SCOPES) {
				if (scope.valueOf(inspection) !== undefined) {
					await config.update(key, undefined, scope.target);
				}
			}
		}
	}
}
