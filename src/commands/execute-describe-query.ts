import * as vscode from 'vscode';
import { render } from 'triplate';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService, ISparqlQueryService, ITripleStoreConfigService } from '@src/languages/sparql/services';

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
		const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

		// Resolve the connection selected for this document (or notebook cell); falls back to the
		// workspace store when none is set.
		const connection = documentConnectionService.getConnectionForDocument(document.uri);
		const template = storeConfigService.getQueryTemplate(connection, 'describe');

		if (!template) {
			vscode.window.showErrorMessage('Could not resolve a "describe" query template for this connection.');
			return;
		}

		const query = render(template, { resourceIri, graphIris: graphIris ?? [] });
		const inferenceEnabled = documentConnectionService.getInferenceEnabledForDocument(document.uri);

		// Run the query entirely in the background against the selected connection and only reveal
		// the resulting triples as a Turtle document. The SPARQL results panel is intentionally not
		// opened for a DESCRIBE — it would otherwise pop up empty while the quads open in an editor.
		try {
			const result = await vscode.window.withProgress(
				{ location: vscode.ProgressLocation.Window, title: `Describing ${resourceIri}…` },
				() => queryService.executeQueryOnConnection(query, connection, inferenceEnabled)
			);

			if (!result || result.type !== 'quads') {
				vscode.window.showInformationMessage(`No description found for ${resourceIri}.`);
				return;
			}

			const resultDocument = await vscode.workspace.openTextDocument({
				content: result.data,
				language: 'turtle'
			});

			await vscode.window.showTextDocument(resultDocument, { preview: true });
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to describe resource: ${error.message}`);
		}
	}
};
