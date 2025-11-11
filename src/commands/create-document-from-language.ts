import * as vscode from 'vscode';
import { mentor } from '@src/mentor';

export const createDocumentFromLanguage = {
	id: 'mentor.command.createDocumentFromLanguage',
	handler: async (language: string) => {
		const content = mentor.configuration.get<string>(`language.${language}.defaultDocumentTemplate`, '');
		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document);
	}
};