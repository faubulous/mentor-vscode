import * as vscode from 'vscode';
import { container, DocumentFactory } from '@src/container';
import { InjectionToken } from '@src/injection-token';

export const createDocument = {
	id: 'mentor.command.createDocument',
	handler: async () => {
		const items: any[] = [];
		const documentFactory = container.resolve<DocumentFactory>(InjectionToken.DocumentFactory);

		items.push({
			label: '$(mentor-notebook) Mentor Notebook',
			command: 'mentor.command.createNotebook'
		});

		for (const lang of await documentFactory.getSupportedLanguagesInfo()) {
			items.push({
				label: `$(${lang.icon})  ${lang.typeName}`,
				command: 'mentor.command.createDocumentFromLanguage',
				args: lang.id
			});
		}

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select document type',
		});

		if (!selected) {
			return;
		}

		if (selected.command) {
			await vscode.commands.executeCommand(selected.command, selected.args);
		}
	}
};