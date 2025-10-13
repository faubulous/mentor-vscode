import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const selectSparqlConnection = {
	commandId: 'mentor.command.selectSparqlConnection',
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
			connection: connection
		}));

		items.push({
			label: '$(add) Create new SPARQL connection...',
			command: 'mentor.command.createSparqlConnection'
		});

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a SPARQL endpoint',
		});

		if (!selected) {
			return;
		}

		if (selected.command) {
			await vscode.commands.executeCommand(selected.command);
		} else {
			await mentor.sparqlConnectionService.setQuerySourceForDocument(document.uri, selected.connection.id);
		}
	}
};