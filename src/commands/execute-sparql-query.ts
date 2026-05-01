import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlResultsController } from '@src/views/webviews';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { executeNotebookCell } from './execute-notebook-cell';

export const executeSparqlQuery = {
    id: 'mentor.command.executeSparqlQuery',
    handler: async (query: SparqlQueryExecutionState): Promise<void> => {
        if (query.notebookIri && query.cellIndex !== undefined) {
            executeNotebookCell.handler(query.notebookIri, query.cellIndex);
        } else if (query.documentIri) {
            const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === query.documentIri);

            if (document) {
                const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
                await controller.executeQueryFromTextDocument(document);
            } else if (query.connectionId && query.query) {
                // Document was closed (e.g. an untitled doc opened via Edit on a background query).
                // Fall back to re-running as a background query so the existing tab is reloaded.
                const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
                const connection = connectionService.getConnection(query.connectionId);

                if (!connection) {
                    throw new Error(`Connection with ID ${query.connectionId} not found.`);
                }

                const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
                await controller.executeBackgroundQuery(connection, query.query, query.label ?? '');
            } else {
                throw new Error(`Document with IRI ${query.documentIri} not found.`);
            }
        } else if (query.connectionId && query.query) {
            const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
            const connection = connectionService.getConnection(query.connectionId);

            if (!connection) {
                throw new Error(`Connection with ID ${query.connectionId} not found.`);
            }

            const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
            await controller.executeBackgroundQuery(connection, query.query, query.label ?? '');
        }
    }
};