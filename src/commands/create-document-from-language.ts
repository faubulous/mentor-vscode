import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/config';

export const createDocumentFromLanguage = {
	id: 'mentor.command.createDocumentFromLanguage',
	handler: async (language: string) => {
		const content = getConfig().get<string>(`language.${language}.defaultDocumentTemplate`, '');
		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document);
	}
};