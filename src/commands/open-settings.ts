import * as vscode from 'vscode';

export const openSettings = {
	id: 'mentor.command.openSettings',
	handler: async () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:faubulous.mentor');
	}
};