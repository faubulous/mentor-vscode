import * as vscode from 'vscode';
import { SparqlEndpoint } from '@/services/sparql-endpoint';
import { sparqlEndpointController } from '@/webviews/sparql-endpoint/sparql-endpoint-controller';

export const editSparqlEndpoint = async (endpoint: SparqlEndpoint, restoreFocus: boolean) => {
	sparqlEndpointController.edit(endpoint);

	if (restoreFocus) {
		// Reset the focus to the endpoint tree.
		vscode.commands.executeCommand('mentor.view.endpointTree.focus');
	}
};