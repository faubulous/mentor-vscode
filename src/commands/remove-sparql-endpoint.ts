import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { SparqlConnection } from '@/services/sparql-connection';

export const removeSparqlEndpoint = async (connection: SparqlConnection) => {
	const confirm = await vscode.window.showWarningMessage(
		'Are you sure you want to remove this SPARQL endpoint?',
		{ modal: true },
		'Remove'
	);
	
	if (confirm !== 'Remove') {
		return;
	}

	await mentor.sparqlConnectionService.removeConnection('global', connection.id);

	vscode.window.showInformationMessage('SPARQL endpoint removed.');
};