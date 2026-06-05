import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { SparqlResultsController } from '@src/views/webviews';

export const executeDescribeQuery = {
	id: 'mentor.command.executeDescribeQuery',
	handler: async (documentUri: vscode.Uri | string, resourceIri: string, graphUris?: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (!document) {
			console.warn(`Unable to retrieve document for URI: ${documentUri.toString()}`);
			return;
		}

		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const connection = connectionService.getConnectionForDocument(document.uri);
		const template = connectionService.getQueryTemplate(connection, 'describe');

		if(!template) {
			vscode.window.showErrorMessage('Could not resolve a "describe" query template for this connection.');
			return;
		}

		const fromClauses = getFromClauses(graphUris);

		const query = template
			.replace(/\{\{resourceIri\}\}/g, resourceIri)
			.replace(/\{\{fromClauses\}\}/g, fromClauses);

		const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
		await controller.executeQuery(document, query);
	}
};

function getFromClauses(graphUris?: string[]): string {
	if (!graphUris || graphUris.length === 0) {
		return '';
	} else {
		return graphUris.map(uri => `\nFROM <${uri}>`).join('');
	}
}