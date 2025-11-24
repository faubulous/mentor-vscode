import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { WorkspaceUri } from '@src/workspace/workspace-uri';
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

		for await (const file of mentor.workspace.getFilesByLanguageId(languageId)) {
			files.push(file);
		}

		const language = await mentor.documentFactory.getLanguageInfo(languageId);
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