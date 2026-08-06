import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry } from '@src/languages/sparql/services';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { resolveNotebookFromContext } from '../../utilities/vscode/notebook';

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

		// Update all cells in one bulk edit; the service fires the change event
		// once per cell so URI-scoped consumers (code lenses, FROM-graph linting)
		// re-evaluate each cell against the new connection.
		await documentConnectionService.setConnectionForNotebook(notebook, selected.connection.id);

		vscode.window.setStatusBarMessage(
			`Set connection to "${selected.connection.endpointUrl}" for all ${notebook.getCells().length} cells`,
			3000
		);
	}
};
