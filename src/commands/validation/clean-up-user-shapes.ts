import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SettingsFileStore } from '@src/services/core';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';

/**
 * Lists the user shape files that are not referenced by any validation profile
 * in this workspace or the user settings and deletes the confirmed ones from the
 * user settings. Files still referenced by another workspace's profiles are shown
 * as protected and left unchecked, so deleting one is a deliberate force-delete.
 * The store graphs are removed by the shape graph service observing the settings
 * change.
 */
export const cleanUpUserShapes = {
	id: 'mentor.command.cleanUpUserShapes',
	handler: async () => {
		const shapeGraphService = container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService);
		const files = container.resolve<SettingsFileStore>(ServiceToken.UserFileStore);

		const unreferenced = shapeGraphService.getUnreferencedUserShapeFiles();

		if (unreferenced.length === 0) {
			vscode.window.showInformationMessage('All user shape files are referenced by validation profiles.');
			return;
		}

		const picks = await vscode.window.showQuickPick(
			unreferenced.map(({ key, protectedBy }) => ({
				label: protectedBy.length > 0 ? `$(shield) ${key}` : key,
				fileName: key,
				description: protectedBy.length > 0
					? `referenced in ${protectedBy.map(ref => `'${ref.name}'`).join(', ')}`
					: shapeGraphService.getUserShapeGraphUri(key),
				// Protected files are force-delete only, so they are not pre-selected.
				picked: protectedBy.length === 0,
			})),
			{
				title: 'Clean Up User Shapes',
				placeHolder: 'Unused user shape files to delete — shielded files are still referenced by another workspace',
				canPickMany: true,
			}
		);

		if (!picks || picks.length === 0) {
			return;
		}

		for (const pick of picks) {
			await files.delete(pick.fileName);
		}

		vscode.window.showInformationMessage(`Deleted ${picks.length} user shape file${picks.length === 1 ? '' : 's'}.`);
	}
};
