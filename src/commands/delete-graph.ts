import * as vscode from 'vscode';
import { container } from '@src/container';
import { mentor } from '@src/mentor';
import { SparqlConnectionService } from '@src/services';
import { sparqlResultsController } from '@src/views/webviews/sparql-results/sparql-results-controller';

export const deleteGraph = {
	id: 'mentor.command.deleteGraph',
	handler: async (documentIri: string, graphIri: vscode.Uri | string) => {
		// Ask for confirmation before deleting
		const answer = await vscode.window.showWarningMessage(
			`Are you sure you want to delete the graph "${graphIri.toString(true)}"? This action cannot be undone.`,
			{ modal: true },
			'Delete'
		);

		if (answer !== 'Delete') {
			return;
		}

		const connectionService = container.resolve(SparqlConnectionService);
		const connection = connectionService.getConnectionForDocument(documentIri);

		if (!connection) {
			vscode.window.showErrorMessage(`Unable to retrieve SPARQL connection for document: ${documentIri}`);
			return;
		}

		if (connection.id === 'workspace') {
			mentor.store.deleteGraphs([graphIri.toString(true)]);
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
			await connectionService.setQuerySourceForDocument(document.uri, connection.id);

			// Show the document and execute the query
			await vscode.window.showTextDocument(document);
			await sparqlResultsController.executeQueryFromTextDocument(document);
		}
	}
};