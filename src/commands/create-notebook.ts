import * as vscode from 'vscode';

export async function createNotebook() {
	const data = new vscode.NotebookData([
		new vscode.NotebookCellData(
			vscode.NotebookCellKind.Code,
			'',
			'sparql'
		)
	]);

	const notebook = await vscode.workspace.openNotebookDocument('mentor-notebook', data);

	await vscode.window.showNotebookDocument(notebook);
}