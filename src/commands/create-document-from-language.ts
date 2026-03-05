import * as vscode from 'vscode';
import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { ConfigurationService } from '@src/services/configuration-service';

export const createDocumentFromLanguage = {
	id: 'mentor.command.createDocumentFromLanguage',
	handler: async (language: string) => {
		const configurationProvider = container.resolve<ConfigurationService>(ServiceToken.ConfigurationService);
		const content = configurationProvider.get<string>(`language.${language}.defaultDocumentTemplate`, '');
		
		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document);
	}
};