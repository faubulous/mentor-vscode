import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from '@src/views/webviews';

export const executeSparqlQueryFromActiveEditor = {
    id: 'mentor.command.executeSparqlQueryFromActiveEditor',
    handler: async (): Promise<void> => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        await sparqlResultsWebviewProvider.executeQueryFromTextDocument(editor.document);
    }
};