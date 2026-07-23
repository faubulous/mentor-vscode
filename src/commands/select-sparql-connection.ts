import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry } from '@src/languages/sparql/services';
import { IDocumentConnectionService } from '@src/languages/sparql/services';

/**
 * Title bar button that opens the connection settings.
 */
const MANAGE_CONNECTIONS_BUTTON: vscode.QuickInputButton = {
	iconPath: new vscode.ThemeIcon('gear'),
	tooltip: 'Manage connections…'
};

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

		const quickPick = vscode.window.createQuickPick();
		quickPick.items = items;
		// Do not pre-focus the first connection (the workspace store): assigning items
		// defaults the active item to the first row, which reads as if it were already
		// the selected connection. Clearing it leaves no connection highlighted until the
		// user picks one.
		quickPick.activeItems = [];
		quickPick.placeholder = 'Select a SPARQL endpoint';
		quickPick.buttons = [MANAGE_CONNECTIONS_BUTTON];

		quickPick.onDidTriggerButton((button) => {
			if (button === MANAGE_CONNECTIONS_BUTTON) {
				vscode.commands.executeCommand('mentor.command.manageSparqlConnections');
			}

			quickPick.hide();
		});

		quickPick.onDidTriggerItemButton(async (e) => {
			const button = e.button as any;

			vscode.commands.executeCommand(button.command, ...button.args);

			quickPick.hide();
		});

		quickPick.onDidChangeSelection(async (e) => {
			const selected = e[0] as any;

			if (selected?.connection) {
				await documentConnectionService.setQuerySourceForDocument(document.uri, selected.connection.id);
			}

			quickPick.hide();
		});

		quickPick.show();
	}
};