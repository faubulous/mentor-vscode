import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from '@/views';

export async function runSparqlQuery(documentIri: string): Promise<void> {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentIri);

    if (!document) {
        throw new Error(`Document with IRI ${documentIri} not found.`);
    }

    await sparqlResultsWebviewProvider.executeQuery(document);
}