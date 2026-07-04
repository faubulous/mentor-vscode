import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry } from '@src/languages/sparql/services';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { resolveNotebookFromContext } from '../utilities/vscode/notebook';

export const setNotebookConnection = {
	id: 'mentor.command.setNotebookConnection',
	handler: async (context?: any) => {
		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const notebook = resolveNotebookFromContext(context);

		if (!notebook) {
			vscode.window.showWarningMessage('No notebook is currently open.');
			return;
		}

		// Show quick pick to select connection
		const connections = connectionRegistry.getConnections();

		if (connections.length === 0) {
			vscode.window.showWarningMessage('No SPARQL connections configured.');
			return;
		}

		const items = connections.map(connection => ({
			label: `$(arrow-swap) ${connection.endpointUrl}`,
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
			documentConnectionService.notifyDocumentConnectionChanged(notebook.uri);
		}

		vscode.window.setStatusBarMessage(
			`Set connection to "${selected.connection.endpointUrl}" for all ${cells.length} cells`,
			3000
		);
	}
};
