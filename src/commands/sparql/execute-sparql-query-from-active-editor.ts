import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlResultsController } from '@src/views/webviews';

export const executeSparqlQueryFromActiveEditor = {
    id: 'mentor.command.executeSparqlQueryFromActiveEditor',
    handler: async (): Promise<void> => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
        await controller.executeQueryFromTextDocument(editor.document);
    }
};