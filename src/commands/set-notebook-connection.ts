import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';

export const setNotebookConnection = {
	id: 'mentor.command.setNotebookConnection',
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

		// Show quick pick to select connection
		const connections = connectionService.getConnections();

		if (connections.length === 0) {
			vscode.window.showWarningMessage('No SPARQL connections configured.');
			return;
		}

		const items = connections.map(connection => ({
			label: `$(database) ${connection.endpointUrl}`,
			description: connection.description,
			connection
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select SPARQL connection for all cells in this notebook'
		});

		if (!selected) {
			return;
		}

		// Update all cells in the notebook
		const cells = notebook.getCells();
		const edits: vscode.NotebookEdit[] = [];

		for (const cell of cells) {
			const metadata = { ...cell.metadata, connectionId: selected.connection.id };
			edits.push(vscode.NotebookEdit.updateCellMetadata(cell.index, metadata));
		}

		if (edits.length > 0) {
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(notebook.uri, edits);
			await vscode.workspace.applyEdit(workspaceEdit);

			// Notify listeners to refresh code lenses
			connectionService.notifyDocumentConnectionChanged(notebook.uri);
		}

		vscode.window.setStatusBarMessage(
			`Set connection to "${selected.connection.endpointUrl}" for all ${cells.length} cells`,
			3000
		);
	}
};
