import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { SparqlEndpoint } from '@/services/sparql-endpoint';

export const deleteSparqlEndpoint = async (connection: SparqlEndpoint) => {
	const confirm = await vscode.window.showWarningMessage(
		'Are you sure you want to remove this SPARQL connection?',
		{ modal: true },
		'Remove'
	);
	
	if (confirm !== 'Remove') {
		return;
	}

	await mentor.sparqlEndpointService.deleteEndpoint(connection.configTarget, connection.id);
	await mentor.credentialStorageService.deleteCredential(connection.id);
};