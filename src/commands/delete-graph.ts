import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { sparqlResultsController } from '@src/views/webviews/sparql-results/sparql-results-controller';

export const deleteGraph = {
	id: 'mentor.command.deleteGraph',
	handler: async (documentIri: string, graphIri: vscode.Uri | string) => {
		const connection = mentor.sparqlConnectionService.getConnectionForDocument(documentIri);

		if (!connection) {
			vscode.window.showErrorMessage(`Unable to retrieve SPARQL connection for document: ${documentIri}`);
			return;
		}

		if (connection.id === 'workspace') {
			mentor.store.deleteGraphs([graphIri.toString()]);
		} else {
			const query = mentor.configuration.get<string>('sparql.dropGraphQuery');

			if (!query) {
				vscode.window.showErrorMessage('Could not retrieve query from configuration: mentor.sparql.dropGraphQuery');
				return;
			}

			// Create an untitled SPARQL document with the drop graph query
			const document = await vscode.workspace.openTextDocument({
				content: query.replace('@graphIri', graphIri.toString(true)),
				language: 'sparql'
			});

			// Set the connection for this document
			await mentor.sparqlConnectionService.setQuerySourceForDocument(document.uri, connection.id);

			// Show the document and execute the query
			await vscode.window.showTextDocument(document);
			await sparqlResultsController.executeQueryFromTextDocument(document);
		}
	}
};