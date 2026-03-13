import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';

export const setNotebookInference = {
	id: 'mentor.command.setNotebookInference',
	handler: async (context?: any) => {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

		// Get the notebook from various possible argument types
		let notebook: vscode.NotebookDocument | undefined;

		if (context && typeof context === 'object') {
			if ('notebook' in context && context.notebook) {
				// Direct NotebookEditor from notebook toolbar
				notebook = context.notebook;
			} else if ('notebookEditor' in context && context.notebookEditor) {
				// From notebook toolbar context object
				notebook = context.notebookEditor.notebook;
			} else if ('scheme' in context && 'fsPath' in context) {
				// URI passed
				notebook = vscode.workspace.notebookDocuments.find(n => n.uri.toString() === context.toString());
			}
		}
		
		// Fallback to active notebook editor
		if (!notebook) {
			notebook = vscode.window.activeNotebookEditor?.notebook;
		}

		if (!notebook) {
			vscode.window.showWarningMessage('No notebook is currently open.');
			return;
		}

		// Show quick pick to select inference setting
		const items = [
			{ label: 'On', description: 'Include inferred triples in query results.', value: true },
			{ label: 'Off', description: 'Only return asserted triples.', value: false },
			{ label: 'Default', description: 'Use connection defaults for each cell.', value: undefined }
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Set inference for all cells in this notebook'
		});

		if (selected === undefined) {
			return; // User cancelled
		}

		// Update all cells in the notebook
		const cells = notebook.getCells();
		const edits: vscode.NotebookEdit[] = [];

		for (const cell of cells) {
			const metadata = { ...cell.metadata };

			if (selected.value === undefined) {
				delete metadata.inferenceEnabled;
			} else {
				metadata.inferenceEnabled = selected.value;
			}

			edits.push(vscode.NotebookEdit.updateCellMetadata(cell.index, metadata));
		}

		if (edits.length > 0) {
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(notebook.uri, edits);

			await vscode.workspace.applyEdit(workspaceEdit);

			// Notify listeners to refresh code lenses
			connectionService.notifyDocumentConnectionChanged(notebook.uri);
		}

		const statusText = selected.value === undefined
			? 'Cleared inference settings'
			: selected.value ? 'Enabled inference' : 'Disabled inference';

		vscode.window.setStatusBarMessage(`${statusText} for all ${cells.length} cells`, 3000);
	}
};
