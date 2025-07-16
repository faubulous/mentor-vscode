import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from '@/views';

export async function runSparqlQueryFromEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    const query = editor.document.getText();
    const documentIri = editor.document.uri.toString();

    await sparqlResultsWebviewProvider.executeQuery(documentIri, query);
}