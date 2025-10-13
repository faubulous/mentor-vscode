import * as vscode from 'vscode';

export const executeNotebookCell = {
	commandId: 'mentor.command.executeNotebookCell',
	handler: async (notebookUri: string, cellIndex: number): Promise<void> => {
		try {
			const uri = vscode.Uri.parse(notebookUri);
			const document = await vscode.workspace.openNotebookDocument(uri);
			const editor = await vscode.window.showNotebookDocument(document);

			if (cellIndex < document.cellCount) {
				const cell = document.cellAt(cellIndex);
				const range = new vscode.NotebookRange(cellIndex, cellIndex + 1);
				editor.selection = range;
				
				await vscode.commands.executeCommand('notebook.cell.execute', {
					uri: cell.notebook.uri,
					cellIndex: cell.index
				});
			} else {
				vscode.window.showErrorMessage(`Cell index ${cellIndex} is out of range`);
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to execute notebook cell: ${error.message}`);
		}
	}
};