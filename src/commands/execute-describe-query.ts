import * as vscode from 'vscode';
import { render } from 'triplate';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService, ITripleStoreConfigService } from '@src/languages/sparql/services';
import { SparqlResultsController } from '@src/views/webviews';

export const executeDescribeQuery = {
	id: 'mentor.command.executeDescribeQuery',
	handler: async (documentUri: vscode.Uri | string, resourceIri: string, graphIris?: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (!document) {
			console.warn(`Unable to retrieve document for URI: ${documentUri.toString()}`);
			return;
		}

		const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const connection = documentConnectionService.getConnectionForDocument(document.uri);
		const template = storeConfigService.getQueryTemplate(connection, 'describe');

		if(!template) {
			vscode.window.showErrorMessage('Could not resolve a "describe" query template for this connection.');
			return;
		}

		const query = render(template, { resourceIri, graphIris: graphIris ?? [] });

		const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
		await controller.executeQuery(document, query);
	}
};
