import * as vscode from 'vscode';
import { SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { sparqlResultsWebviewProvider } from '@/views';
import { executeNotebookCell } from './execute-notebook-cell';
import { restoreUntitledDocument } from './restore-untitled-document';

export async function executeSparqlQuery(queryState: SparqlQueryExecutionState): Promise<void> {
    if (queryState.notebookIri && queryState.cellIndex) {
        executeNotebookCell(queryState.notebookIri, queryState.cellIndex);
    } else {
        let documentIri: string | undefined = queryState.documentIri;

        if (documentIri.startsWith('untitled') && queryState.query) {
            // Handle untitled documents by restoring them first. The document
            // may get a new IRI as the untitled: URIs are generated dynamically.
            documentIri = await restoreUntitledDocument(documentIri, queryState.query);
        }

        if (documentIri?.startsWith('file')) {
            const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentIri);

            if (!document) {
                throw new Error(`Document with IRI ${documentIri} not found.`);
            }

            await sparqlResultsWebviewProvider.executeQuery(document);
        }
    }
}