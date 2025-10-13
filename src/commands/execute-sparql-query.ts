import * as vscode from 'vscode';
import { SparqlQueryExecutionState } from '@src/services/sparql-query-state';
import { sparqlResultsWebviewProvider } from '@src/views/webviews';
import { executeNotebookCell } from './execute-notebook-cell';

export const executeSparqlQuery = {
    id: 'mentor.command.executeSparqlQuery',
    handler: async (query: SparqlQueryExecutionState): Promise<void> => {
        if (query.notebookIri && query.cellIndex !== undefined) {
            // @ts-ignore: handler signature
            executeNotebookCell.handler(query.notebookIri, query.cellIndex);
        } else if (query.documentIri) {
            const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === query.documentIri);
            if (!document) {
                throw new Error(`Document with IRI ${query.documentIri} not found.`);
            }
            await sparqlResultsWebviewProvider.executeQueryFromTextDocument(document);
        }
    }
};