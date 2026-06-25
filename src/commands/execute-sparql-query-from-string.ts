import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlResultsController } from '@src/views/webviews';
import { NotebookController } from '@src/services/notebook/notebook-controller';
import { resolveQueryContext, isNotebookCell } from '@src/utilities/query-context';

/**
 * Executes a SPARQL query given as a string against the connection of an optional
 * context document or notebook cell.
 *
 * The context determines where results are shown: when it is a notebook cell, the
 * results are rendered in the cell output (like an ordinary query cell); otherwise
 * they are shown in the SPARQL results panel, inheriting the context document's
 * connection. The query string is never opened as a document.
 *
 * Internal command: invoked by the triplate execute commands and reusable wherever a
 * rendered/generated SPARQL string needs to run in a given editor or notebook context.
 */
export const executeSparqlQueryFromString = {
	id: 'mentor.command.executeSparqlQueryFromString',
	handler: async (query: string, contextUri?: vscode.Uri | string): Promise<void> => {
		const context = resolveQueryContext(contextUri);

		if (!context) {
			vscode.window.showWarningMessage('No document context found to execute the query.');
			return;
		}

		if (isNotebookCell(context)) {
			const controller = container.resolve<NotebookController>(ServiceToken.NotebookController);
			await controller.executeQueryInCell(context, query);
		} else {
			const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
			await controller.executeQuery(context, query);
		}
	}
};
