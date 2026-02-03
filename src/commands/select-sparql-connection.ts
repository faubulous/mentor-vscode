import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const selectSparqlConnection = {
	id: 'mentor.command.selectSparqlConnection',
	handler: async (document: vscode.TextDocument) => {
		if (!document) {
			vscode.window.showWarningMessage('No document valid was provided.');
			return;
		}

		// Show a quick pick to select from existing SPARQL connections
		const connections = await mentor.sparqlConnectionService.getConnections();

		if (connections.length === 0) {
			vscode.window.showWarningMessage('No SPARQL endpoints configured. Please add one first.');
			return;
		}

		const items: any[] = connections.map(connection => ({
			label: `$(database) ${connection.endpointUrl}`,
			connection: connection,
			buttons: [{
				iconPath: new vscode.ThemeIcon('edit'),
				tooltip: 'Edit Connection',
				command: 'mentor.command.editSparqlConnection',
				args: [connection]
			}]
		}));

		items.push({
			label: '$(database-connection) Manage Connections...',
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
				await mentor.sparqlConnectionService.setQuerySourceForDocument(document.uri, selected.connection.id);
			}

			quickPick.hide();
		});

		quickPick.show();
	}
};