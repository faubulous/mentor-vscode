import * as vscode from 'vscode';
import { render } from 'triplate';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService, ITripleStoreConfigService } from '@src/languages/sparql/services';
import { IDocumentContextService } from '@src/services/document';
import { WorkspaceUri } from '@src/providers';

/**
 * Creates an untitled SPARQL document that queries the RDF document in the active editor.
 *
 * Workspace documents are loaded into the in-memory store as named graphs keyed by their workspace
 * URI, so the query is scoped with `GRAPH <documentIri>` — a plain triple pattern would match
 * nothing. That graph IRI is meaningful only to the workspace store, so for any other connection
 * the parameter is omitted and the template renders its unscoped branch instead.
 */
export const createSparqlQueryFromDocument = {
	id: 'mentor.command.createSparqlQueryFromDocument',
	handler: async (): Promise<void> => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}

		const documentUri = editor.document.uri;

		const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const connection = documentConnectionService.getConnectionForDocument(documentUri);

		const template = storeConfigService.getQueryTemplate(connection, 'documentQuery');

		if (!template) {
			vscode.window.showErrorMessage('SPARQL query template is not defined in settings.');
			return;
		}

		const isWorkspaceStore = storeConfigService.isWorkspaceConnectionId(connection.id);
		const graphIri = isWorkspaceStore ? getDocumentGraphIri(documentUri) : undefined;

		// The parameter is omitted rather than passed as `undefined`: triplate treats a present key
		// as bound and rejects the value, whereas an absent optional parameter makes the template's
		// `{% if %}` branch false and renders the unscoped query.
		const parameters: Record<string, string> = graphIri ? { documentIri: graphIri } : {};

		let content: string;

		try {
			content = render(template, parameters);
		} catch (error: any) {
			// A customized template may declare `documentIri` as required, which fails to bind when
			// no graph is known. Surface it instead of failing the command opaquely.
			vscode.window.showErrorMessage(`Could not render the document query template: ${error.message}`);
			return;
		}

		const document = await vscode.workspace.openTextDocument({ content, language: 'sparql' });

		await vscode.window.showTextDocument(document);

		// Bind the generated query to the store the source document targets, so executing it does
		// not silently fall back to the workspace store.
		if (!isWorkspaceStore) {
			await documentConnectionService.setQuerySourceForDocument(document.uri, connection.id);
		}
	}
};

/**
 * Resolves the IRI of the named graph a document is loaded into.
 *
 * Prefers the loaded document context, whose `graphIri` carries the slug fragment that notebook
 * cells are indexed under; falls back to the plain workspace URI for a document that is not indexed.
 * @param documentUri The URI of the document or notebook cell.
 * @returns The canonical graph IRI, or `undefined` if the document has no workspace URI.
 */
function getDocumentGraphIri(documentUri: vscode.Uri): string | undefined {
	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const context = contextService.getContextFromUri(documentUri.toString());

	if (context) {
		return WorkspaceUri.toCanonicalString(context.graphIri);
	}

	return WorkspaceUri.toWorkspaceUri(documentUri)?.toString();
}
