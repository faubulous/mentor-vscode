import * as vscode from 'vscode';

const getConfiguration = () => vscode.workspace.getConfiguration('mentor');

export const createDocumentFromLanguage = {
	id: 'mentor.command.createDocumentFromLanguage',
	handler: async (language: string) => {
		const content = getConfiguration().get<string>(`language.${language}.defaultDocumentTemplate`, '');
		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document);
	}
};