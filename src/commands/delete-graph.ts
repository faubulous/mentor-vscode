import * as vscode from 'vscode';
import { render } from 'triplate';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService, ITripleStoreConfigService } from '@src/languages/sparql/services';
import { SparqlResultsController } from '@src/views/webviews';
import { WorkspaceUri } from '@src/providers/workspace-uri';

export const deleteGraph = {
	id: 'mentor.command.deleteGraph',
	handler: async (documentIri: string, graphIri: vscode.Uri | string) => {
		// Ask for confirmation before deleting
		const answer = await vscode.window.showWarningMessage(
			`Are you sure you want to delete the graph "${WorkspaceUri.toCanonicalString(graphIri)}"? This action cannot be undone.`,
			{ modal: true },
			'Delete'
		);

		if (answer !== 'Delete') {
			return;
		}

		const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const connection = documentConnectionService.getConnectionForDocument(documentIri);

		if (!connection) {
			vscode.window.showErrorMessage(`Unable to retrieve SPARQL connection for document: ${documentIri}`);
			return;
		}

		if (connection.id === 'workspace') {
			container.resolve<Store>(ServiceToken.Store).deleteGraphs([WorkspaceUri.toCanonicalString(graphIri)]);
		} else {
			const query = storeConfigService.getQueryTemplate(connection, 'dropGraph');

			if (!query) {
				vscode.window.showErrorMessage('Could not resolve a "drop graph" query for this connection.');
				return;
			}

			// Create an untitled SPARQL document with the drop graph query
			const document = await vscode.workspace.openTextDocument({
				content: render(query, { graphIri: WorkspaceUri.toCanonicalString(graphIri) }),
				language: 'sparql'
			});

			// Set the connection for this document
			await documentConnectionService.setQuerySourceForDocument(document.uri, connection.id);

			// Show the document and execute the query
			await vscode.window.showTextDocument(document);
			
			const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
			await controller.executeQueryFromTextDocument(document);
		}
	}
};