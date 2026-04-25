import * as vscode from 'vscode';

type ActionItem = vscode.QuickPickItem & {
	action: 'create-new' | 'add-existing';
	notebookUri?: vscode.Uri;
};

function getEditorCellData(editor: vscode.TextEditor): vscode.NotebookCellData {
	const document = editor.document;

	return new vscode.NotebookCellData(
		vscode.NotebookCellKind.Code,
		document.getText(),
		document.languageId
	);
}

function getNotebookFileName(uri: vscode.Uri): string {
	const parts = uri.path.split('/');
	return parts[parts.length - 1] || uri.toString();
}

async function getWorkspaceMentorNotebookUris(): Promise<vscode.Uri[]> {
	const notebookUris = await vscode.workspace.findFiles('**/*.mnb');

	return notebookUris.sort((a, b) => a.path.localeCompare(b.path));
}

async function createNewNotebook(cellData: vscode.NotebookCellData): Promise<void> {
	const data = new vscode.NotebookData([cellData]);
	const notebook = await vscode.workspace.openNotebookDocument('mentor-notebook', data);

	await vscode.window.showNotebookDocument(notebook);
}

async function addToExistingNotebook(notebookUri: vscode.Uri, cellData: vscode.NotebookCellData): Promise<void> {
	const notebook = vscode.workspace.notebookDocuments.find(n => n.uri.toString() === notebookUri.toString())
		?? await vscode.workspace.openNotebookDocument(notebookUri);
	const newCellIndex = notebook.cellCount;

	const workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.set(notebook.uri, [vscode.NotebookEdit.insertCells(notebook.cellCount, [cellData])]);

	await vscode.workspace.applyEdit(workspaceEdit);
	const notebookEditor = await vscode.window.showNotebookDocument(notebook);
	const newCellRange = new vscode.NotebookRange(newCellIndex, newCellIndex + 1);

	notebookEditor.selections = [newCellRange];
	notebookEditor.revealRange(newCellRange, vscode.NotebookEditorRevealType.InCenter);
}

export const addActiveEditorToNotebook = {
	id: 'mentor.command.addActiveEditorToNotebook',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}

		const notebookUris = await getWorkspaceMentorNotebookUris();
		const actionItems: ActionItem[] = [{ label: '$(add) Create New Notebook', action: 'create-new' }];

		for (const notebookUri of notebookUris) {
			actionItems.push({
				label: `$(notebook) ${getNotebookFileName(notebookUri)}`,
				description: notebookUri.toString(),
				action: 'add-existing',
				notebookUri,
			});
		}

		const selectedAction = await vscode.window.showQuickPick(actionItems, {
			placeHolder: 'Create a new notebook or choose an existing Mentor notebook',
		});

		if (!selectedAction) {
			return;
		}

		const cellData = getEditorCellData(editor);

		if (selectedAction.action === 'create-new') {
			await createNewNotebook(cellData);
			return;
		}

		if (!selectedAction.notebookUri) {
			return;
		}

		await addToExistingNotebook(selectedAction.notebookUri, cellData);
	}
};