import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const addSparqlEndpoint = async () => {
	const endpointUrl = await vscode.window.showInputBox({
		prompt: 'Enter the SPARQL endpoint URL',
		ignoreFocusOut: true,
		placeHolder: 'https://example.org/sparql'
	});

	if (!endpointUrl) return;

	await mentor.sparqlConnectionService.addConnection(endpointUrl, endpointUrl, 'user');

	vscode.window.showInformationMessage('SPARQL endpoint added.');
};