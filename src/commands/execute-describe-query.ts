import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlResultsController } from '@src/views/webviews';
import { getConfig } from '@src/utilities/vscode/config';

export const executeDescribeQuery = {
	id: 'mentor.command.executeDescribeQuery',
	handler: async (documentUri: vscode.Uri | string, resourceIri: string, graphUris?: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (!document) {
			console.warn(`Unable to retrieve document for URI: ${documentUri.toString()}`);
			return;
		}

		const template = getConfig().get<string>('sparql.describeQueryTemplate');

		if(!template) {
			vscode.window.showErrorMessage('Describe query template is not defined in the configuration: mentor.sparql.describeQueryTemplate');
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