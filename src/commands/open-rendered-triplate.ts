import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-service';
import { SparqlResultsController } from '@src/views/webviews';

/**
 * Opens the rendered output of a triplate template in a new untitled document,
 * reusing the source document's language. For SPARQL templates the rendered query
 * inherits the source's connection and is executed immediately, with results shown
 * in the SPARQL results panel. For RDF templates (Turtle, etc.) the rendered document
 * is the end result and is simply opened.
 *
 * Internal command: invoked by the triplate execute commands; not contributed to the
 * command palette.
 */
export const openRenderedTriplate = {
	id: 'mentor.command.openRenderedTriplate',
	handler: async (sourceDocumentUri: vscode.Uri | string, rendered: string): Promise<void> => {
		const uri = sourceDocumentUri.toString();
		const sourceDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri);

		if (!sourceDocument) {
			vscode.window.showWarningMessage('No template document found to render.');
			return;
		}

		const language = sourceDocument.languageId;
		const document = await vscode.workspace.openTextDocument({ content: rendered, language });

		if (language !== 'sparql') {
			await vscode.window.showTextDocument(document);
			return;
		}

		// Inherit the template's connection so the rendered query runs against the same source.
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const connection = connectionService.getConnectionForDocument(sourceDocument.uri);

		if (connection && connection.id !== WORKSPACE_CONNECTION.id) {
			await connectionService.setQuerySourceForDocument(document.uri, connection.id);
		}

		await vscode.window.showTextDocument(document);

		const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
		await controller.executeQuery(document, rendered);
	}
};
