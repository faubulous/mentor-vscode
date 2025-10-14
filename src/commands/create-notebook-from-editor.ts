import * as vscode from 'vscode';

export const createNotebookFromEditor = {
	id: 'mentor.command.createNotebookFromEditor',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}

		const document = editor.document;
		const content = document.getText();
		const data = new vscode.NotebookData([
			new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				content,
				document.languageId
			)
		]);

		const notebook = await vscode.workspace.openNotebookDocument('mentor-notebook', data);
		
		await vscode.window.showNotebookDocument(notebook);
	}
};