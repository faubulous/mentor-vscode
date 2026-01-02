import * as vscode from 'vscode';

export const openMentorHomepage = {
	id: 'mentor.command.openMentorHomepage',
	handler: async () => {
        const extension = vscode.extensions.getExtension('faubulous.mentor');

        if (extension) {
            const url = vscode.Uri.parse(extension.packageJSON.homepage);

            await vscode.commands.executeCommand('vscode.open', url);
        }
	}
};