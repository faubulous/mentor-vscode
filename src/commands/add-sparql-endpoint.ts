import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { mentor } from '../mentor';
import { SparqlConnection } from '@/services/sparql-connection';

export const addSparqlEndpoint = async () => {
	const endpoint: SparqlConnection = {
		id: uuidv4(),
		endpointUrl: 'https://example.org/sparql',
		scope: 'global',
	}

	await vscode.commands.executeCommand('mentor.command.editSparqlEndpoint', endpoint);

	// await mentor.sparqlConnectionService.addConnection('global', endpointUrl);

	// vscode.window.showInformationMessage('SPARQL endpoint added.');
};