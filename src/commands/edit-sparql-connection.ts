import * as vscode from 'vscode';
import { SparqlConnection } from '@src/services/sparql-connection';
import { sparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';

export const editSparqlConnection = {
	commandId: 'mentor.command.editSparqlConnection',
	handler: async (endpoint: SparqlConnection, restoreFocus: boolean) => {
		sparqlConnectionController.edit(endpoint);
		
		if (restoreFocus) {
			// Reset the focus to the endpoint tree.
			vscode.commands.executeCommand('mentor.view.connectionTree.focus');
		}
	}
};