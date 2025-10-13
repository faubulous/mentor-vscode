import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from '@src/views/webviews';

export const executeDescribeQuery = {
	id: 'mentor.command.executeDescribeQuery',
	handler: async (documentUri: vscode.Uri, resourceIri: string) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (!document) {
			console.warn(`Unable to retrieve document for URI: ${documentUri.toString()}`);
			return;
		}

		const query = `CONSTRUCT { <${resourceIri}> ?p ?o } WHERE { <${resourceIri}> ?p ?o }`;
		
		await sparqlResultsWebviewProvider.executeQuery(document, query);
	}
};