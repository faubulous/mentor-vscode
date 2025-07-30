import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from '@/views';

export async function runSparqlQueryFromEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    await sparqlResultsWebviewProvider.executeQuery(editor.document);
}