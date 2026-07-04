import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry } from '@src/languages/sparql/services';
import { IDocumentConnectionService } from '@src/languages/sparql/services';

export const selectSparqlConnection = {
	id: 'mentor.command.selectSparqlConnection',
	handler: async (document: vscode.TextDocument) => {
		if (!document) {
			vscode.window.showWarningMessage('No document valid was provided.');
			return;
		}

		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);

		// Show a quick pick to select from existing SPARQL connections
		const connections = await connectionRegistry.getConnections();

		if (connections.length === 0) {
			vscode.window.showWarningMessage('No SPARQL endpoints configured. Please add one first.');
			return;
		}

		const items: any[] = connections.map(connection => ({
			label: `$(arrow-swap) ${connection.endpointUrl}`,
			description: connection.description,
			connection: connection,
			buttons: [{
				iconPath: new vscode.ThemeIcon('edit'),
				tooltip: 'Edit Connection',
				command: 'mentor.command.editSparqlConnection',
				args: [connection]
			}]
		}));

		items.push({
			label: '$(settings-gear) Manage Connections...',
			command: 'mentor.command.manageSparqlConnections'
		});

		const quickPick = vscode.window.createQuickPick();
		quickPick.items = items;
		quickPick.placeholder = 'Select a SPARQL endpoint';

		quickPick.onDidTriggerItemButton(async (e) => {
			const button = e.button as any;

			vscode.commands.executeCommand(button.command, ...button.args);

			quickPick.hide();
		});

		quickPick.onDidChangeSelection(async (e) => {
			const selected = e[0] as any;

			if (selected?.command) {
				await vscode.commands.executeCommand(selected.command);
			} else if (selected?.connection) {
				await documentConnectionService.setQuerySourceForDocument(document.uri, selected.connection.id);
			}

			quickPick.hide();
		});

		quickPick.show();
	}
};