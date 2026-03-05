import * as vscode from 'vscode';
import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { ConfigurationProvider } from '@src/services/configuration-provider';

export const createDocumentFromLanguage = {
	id: 'mentor.command.createDocumentFromLanguage',
	handler: async (language: string) => {
		const configurationProvider = container.resolve<ConfigurationProvider>(InjectionToken.ConfigurationProvider);
		const content = configurationProvider.config().get<string>(`language.${language}.defaultDocumentTemplate`, '');
		
		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document);
	}
};