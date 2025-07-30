import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from '@/views';

export async function runSparqlQuery(documentIri: string): Promise<void> {
    const uri = vscode.Uri.parse(documentIri);
    const document = await vscode.workspace.openTextDocument(uri);

    if (!document) {
        vscode.window.showErrorMessage('Document not found.');
        return;
    }

    const query = document.getText();

    await sparqlResultsWebviewProvider.executeQuery(documentIri, query);
}