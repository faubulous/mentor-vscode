import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/services/sparql';
import { SparqlConnection } from '@src/services/sparql/sparql-connection';
import { SparqlResultsController } from '@src/views/webviews';
import { getConfig } from '@src/utilities/config';

export const listGraphs = {
  id: 'mentor.command.listGraphs',
  handler: async (connection: SparqlConnection): Promise<void> => {
    const query = getConfig().get<string>('sparql.listGraphsQuery');

    if (!query) {
      vscode.window.showErrorMessage('Could not retrieve query from configuration: mentor.sparql.listGraphsQuery');
      return;
    }

    // Create an untitled SPARQL document with the list graphs query
    const document = await vscode.workspace.openTextDocument({
      content: query,
      language: 'sparql'
    });


    // Set the connection for this document
    const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
    await connectionService.setQuerySourceForDocument(document.uri, connection.id);

    // Show the document and execute the query
    await vscode.window.showTextDocument(document);

    const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
    await controller.executeQueryFromTextDocument(document);
  }
};
