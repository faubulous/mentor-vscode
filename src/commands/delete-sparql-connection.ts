import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { SparqlConnection } from '@/services/sparql-connection';

export const deleteSparqlConnection = async (connection: SparqlConnection) => {
	const confirm = await vscode.window.showWarningMessage(
		'Are you sure you want to remove this SPARQL connection?',
		{ modal: true },
		'Remove'
	);
	
	if (confirm !== 'Remove') {
		return;
	}

	await mentor.sparqlConnectionService.deleteConnection(connection.id);
	await mentor.credentialStorageService.deleteCredential(connection.id);
};