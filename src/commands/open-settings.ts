import * as vscode from 'vscode';

export const openSettings = {
	commandId: 'mentor.command.openSettings',
	handler: async () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:faubulous.mentor');
	}
};