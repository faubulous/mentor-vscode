import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WorkspaceUri } from '@src/workspace/workspace-uri';
import { IWorkspaceFileService } from '@src/services/core';
import { DocumentFactory } from '@src/workspace/document-factory';
import { getFileName, getPath } from '@src/utilities';

export type FileQuickPickItem = vscode.QuickPickItem & {
	iri?: vscode.Uri,
	command?: string,
	args?: any
};

export const openFileFromLanguage = {
	id: 'mentor.command.openFileFromLanguage',
	handler: async (languageId: string) => {
		const files: vscode.Uri[] = [];
		const workspaceFileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		const documentFactory = container.resolve<DocumentFactory>(ServiceToken.DocumentFactory);

		for await (const file of workspaceFileService.getFilesByLanguageId(languageId)) {
			files.push(file);
		}

		const language = await documentFactory.getLanguageInfo(languageId);
		const languageName = language ? language.name : languageId;
		const languageIcon = language ? language.icon : 'file';

		const quickPick = vscode.window.createQuickPick<FileQuickPickItem>();
		quickPick.title = 'Select the file to open:';

		let items: FileQuickPickItem[] = [];

		if (files.length === 0) {
			items = [{
				iri: undefined,
				label: 'No files found for this language: ' + languageName
			}];
		} else {
			items = files
				.map(file => ({
					fileUri: file.toString(),
					workspaceUri: WorkspaceUri.toWorkspaceUri(file)
				}))
				.map(item => ({
					...item,
					icon: languageIcon,
					label: `$(${languageIcon})  ${getFileName(item.fileUri)}`,
					description: item.workspaceUri ? '~' + getPath(item.workspaceUri.fsPath) : undefined,
					iri: item.workspaceUri
				}))
				.sort((a, b) => a.label.localeCompare(b.label));
		}

		if (language) {
			items.push({
				iri: undefined,
				label: '',
				kind: vscode.QuickPickItemKind.Separator
			});

			items.push({
				iri: undefined,
				label: `$(${language.icon})  New ${language.typeName}`,
				command: 'mentor.command.createDocumentFromLanguage',
				args: language.id
			});
		}

		quickPick.items = items;
		quickPick.onDidChangeSelection(async (selection) => {
			const item = selection[0];

			if (item && item.iri) {
				const document = await vscode.workspace.openTextDocument(item.iri);

				vscode.window.showTextDocument(document);
			} else if (item && item.command) {
				vscode.commands.executeCommand(item.command, item.args);
			}
		});

		quickPick.show();
	}
};