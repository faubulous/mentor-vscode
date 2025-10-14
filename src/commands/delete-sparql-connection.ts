import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { SparqlConnection } from '@src/services/sparql-connection';

export const deleteSparqlConnection = {
	id: 'mentor.command.deleteSparqlConnection',
	handler: async (connection: SparqlConnection) => {
		const confirm = await vscode.window.showWarningMessage(
			'Are you sure you want to delete this SPARQL connection?',
			{ modal: true },
			'Delete'
		);

		if (confirm !== 'Delete') {
			return;
		}

		await mentor.sparqlConnectionService.deleteConnection(connection.id);
		await mentor.sparqlConnectionService.saveConfiguration();

		await mentor.credentialStorageService.deleteCredential(connection.id);

		vscode.window.showInformationMessage('SPARQL connection deleted.');
	}
};