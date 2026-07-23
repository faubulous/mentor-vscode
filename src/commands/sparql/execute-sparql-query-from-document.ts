import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlResultsController } from '@src/views/webviews';

export const executeSparqlQueryFromDocument = {
    id: 'mentor.command.executeSparqlQueryFromDocument',
    handler: async (documentIri: string): Promise<void> => {
        const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentIri);

        if (!document) {
            throw new Error(`Document with IRI ${documentIri} not found.`);
        }

        const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
        await controller.executeQueryFromTextDocument(document);
    }
};