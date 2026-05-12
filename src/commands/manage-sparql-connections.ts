import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SettingsPanelController } from '@src/views/webviews/settings/settings-panel-controller';

export const manageSparqlConnections = {
	id: 'mentor.command.manageSparqlConnections',
	handler: async () => {
		const controller = container.resolve<SettingsPanelController>(ServiceToken.SettingsPanelController);
		await controller.show(vscode.ViewColumn.Active, 'connections');
	}
};
