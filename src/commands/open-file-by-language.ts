import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { WorkspaceUri } from '@/workspace-uri';
import { getFileName, getPath } from '@/utilities';

export async function openFileByLanguage(languageId: string) {
	const files: vscode.Uri[] = [];

	for await (const file of mentor.workspace.getFilesByLanguageId(languageId)) {
		files.push(file);
	}

	const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { iri: vscode.Uri }>();
	quickPick.title = 'Select the file to open:';
	quickPick.items = files.map(file => ({
		label: getFileName(file.toString()),
		description: '~' + getPath(WorkspaceUri.toWorkspaceUri(file).fsPath),
		iri: file
	})).sort((a, b) => a.label.localeCompare(b.label));

	quickPick.onDidChangeSelection(async (selection) => {
		if (selection.length > 0) {
			const fileUri = selection[0].iri;
			const document = await vscode.workspace.openTextDocument(fileUri);

			vscode.window.showTextDocument(document);
		}
	});

	quickPick.show();
}