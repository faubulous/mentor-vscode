import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { WorkspaceUri } from '@src/workspace/workspace-uri';
import { getFileName, getPath } from '@src/utilities';

export async function openFileByLanguage(languageId: string) {
	const files: vscode.Uri[] = [];

	for await (const file of mentor.workspace.getFilesByLanguageId(languageId)) {
		files.push(file);
	}

	const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { iri: vscode.Uri | undefined }>();
	quickPick.title = 'Select the file to open:';

	if (files.length === 0) {
		quickPick.items = [{
			iri: undefined,
			label: 'No files found for this language: ' + languageId
		}];
	} else {
		const items = files.map(file => ({
			fileUri: file.toString(),
			workspaceUri: WorkspaceUri.toWorkspaceUri(file)
		}));

		quickPick.items = items.map(item => ({
			...item,
			label: getFileName(item.fileUri),
			description: item.workspaceUri ? '~' + getPath(item.workspaceUri.fsPath) : undefined,
			iri: item.workspaceUri
		})).sort((a, b) => a.label.localeCompare(b.label));

		quickPick.onDidChangeSelection(async (selection) => {
			if (selection.length > 0) {
				const fileUri = selection[0].iri;

				if (fileUri) {
					const document = await vscode.workspace.openTextDocument(fileUri);

					vscode.window.showTextDocument(document);
				}
			}
		});
	}

	quickPick.show();
}