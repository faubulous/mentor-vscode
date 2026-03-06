import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IConfigurationService } from '@src/services/core';

export const createDocumentFromLanguage = {
	id: 'mentor.command.createDocumentFromLanguage',
	handler: async (language: string) => {
		const configurationProvider = container.resolve<IConfigurationService>(ServiceToken.ConfigurationService);
		const content = configurationProvider.get<string>(`language.${language}.defaultDocumentTemplate`, '');
		
		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document);
	}
};