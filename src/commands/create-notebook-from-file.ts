import * as vscode from 'vscode';

export async function createNotebookFromFile() {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor found.');
		return;
	}

	const document = editor.document;

	// Read the content of the current file
	const content = document.getText();

	// Create a new notebook with a single cell
	const notebookData = new vscode.NotebookData([
		new vscode.NotebookCellData(
			vscode.NotebookCellKind.Code, // Cell type: Code
			content,                     // Cell content
			document.languageId          // Use the current file's language ID
		)
	]);

	// Open the notebook
	const notebook = await vscode.workspace.openNotebookDocument('jupyter-notebook', notebookData);

	await vscode.window.showNotebookDocument(notebook);
}