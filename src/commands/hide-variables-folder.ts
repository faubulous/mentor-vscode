import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const hideVariablesFolder = {
	id: 'mentor.command.hideVariablesFolder',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showVariablesFolder', false);
		vscode.commands.executeCommand("setContext", "view.showVariablesFolder", false);
	}
};
