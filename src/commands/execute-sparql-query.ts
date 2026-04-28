import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlResultsController } from '@src/views/webviews';
import { executeNotebookCell } from './execute-notebook-cell';

export const executeSparqlQuery = {
    id: 'mentor.command.executeSparqlQuery',
    handler: async (query: SparqlQueryExecutionState): Promise<void> => {
        if (query.notebookIri && query.cellIndex !== undefined) {
            executeNotebookCell.handler(query.notebookIri, query.cellIndex);
        } else if (query.documentIri) {
            const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === query.documentIri);

            if (!document) {
                throw new Error(`Document with IRI ${query.documentIri} not found.`);
            }
            
            const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
            await controller.executeQueryFromTextDocument(document);
        }
    }
};