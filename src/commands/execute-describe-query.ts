import * as vscode from 'vscode';
import { render } from 'triplate';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService, ISparqlConnectionRegistry, ISparqlQueryService, ITripleStoreConfigService } from '@src/languages/sparql/services';

export const executeDescribeQuery = {
	id: 'mentor.command.executeDescribeQuery',
	handler: async (documentUri: vscode.Uri | string, resourceIri: string, graphIris?: string[], connectionId?: string) => {
		const uri = typeof documentUri === 'string' ? vscode.Uri.parse(documentUri) : documentUri;
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());

		const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

		// Reuse the exact connection the originating query ran against when it is known
		// (the results view forwards it for every binding-table describe). This keeps the
		// describe on the same store even for background/generated queries whose source
		// document targets a different connection. Otherwise fall back to the connection
		// configured for the source document (or notebook cell), defaulting to the
		// workspace store when none is set.
		const connection = (connectionId ? connectionRegistry.getConnection(connectionId) : undefined)
			?? (document ? documentConnectionService.getConnectionForDocument(document.uri) : undefined);

		if (!connection) {
			console.warn(`Unable to resolve a connection for describe query: ${uri.toString()}`);
			return;
		}

		const template = storeConfigService.getQueryTemplate(connection, 'describe');

		if (!template) {
			vscode.window.showErrorMessage('Could not resolve a "describe" query template for this connection.');
			return;
		}

		const query = render(template, { resourceIri, graphIris: graphIris ?? [] });
		const inferenceEnabled = document
			? documentConnectionService.getInferenceEnabledForDocument(document.uri)
			: undefined;

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
