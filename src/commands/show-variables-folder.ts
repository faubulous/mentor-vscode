import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const showVariablesFolder = {
	id: 'mentor.command.showVariablesFolder',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showVariablesFolder', true);
		vscode.commands.executeCommand("setContext", "view.showVariablesFolder", true);
	}
};
