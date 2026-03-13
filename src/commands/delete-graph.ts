import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { SparqlResultsController } from '@src/views/webviews';
import { getConfig } from '@src/utilities/vscode/config';

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

		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const connection = connectionService.getConnectionForDocument(documentIri);

		if (!connection) {
			vscode.window.showErrorMessage(`Unable to retrieve SPARQL connection for document: ${documentIri}`);
			return;
		}

		if (connection.id === 'workspace') {
			container.resolve<Store>(ServiceToken.Store).deleteGraphs([graphIri.toString(true)]);
		} else {
			const query = getConfig().get<string>('sparql.dropGraphQuery');

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
			
			const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
			await controller.executeQueryFromTextDocument(document);
		}
	}
};