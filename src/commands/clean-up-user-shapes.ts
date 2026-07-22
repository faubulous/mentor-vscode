import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SettingsFileStore } from '@src/services/core';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';

/**
 * Lists the user shape files that are not referenced by any validation profile
 * in this workspace or the user settings and deletes the confirmed ones from
 * the user settings. The store graphs are removed by the shape graph service
 * observing the settings change.
 */
export const cleanUpUserShapes = {
	id: 'mentor.command.cleanUpUserShapes',
	handler: async () => {
		const shapeGraphService = container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService);
		const files = container.resolve<SettingsFileStore>(ServiceToken.UserShapeFileStore);

		const orphaned = shapeGraphService.getOrphanedUserShapeFiles();

		if (orphaned.length === 0) {
			vscode.window.showInformationMessage('All user shape files are referenced by validation profiles.');
			return;
		}

		const picks = await vscode.window.showQuickPick(
			orphaned.map(fileName => ({
				label: fileName,
				description: shapeGraphService.getUserShapeGraphUri(fileName),
				picked: true,
			})),
			{
				title: 'Clean Up User Shapes',
				placeHolder: 'Unused user shape files to delete — profiles in other workspaces may still reference them',
				canPickMany: true,
			}
		);

		if (!picks || picks.length === 0) {
			return;
		}

		for (const pick of picks) {
			await files.delete(pick.label);
		}

		vscode.window.showInformationMessage(`Deleted ${picks.length} user shape file${picks.length === 1 ? '' : 's'}.`);
	}
};
