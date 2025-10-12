import * as vscode from 'vscode';
import { SparqlConnection } from '@/services/sparql-connection';
import { sparqlConnectionController } from '@/webviews/sparql-connection/sparql-connection-controller';

export const editSparqlConnection = async (endpoint: SparqlConnection, restoreFocus: boolean) => {
	sparqlConnectionController.edit(endpoint);

	if (restoreFocus) {
		// Reset the focus to the endpoint tree.
		vscode.commands.executeCommand('mentor.view.endpointTree.focus');
	}
};