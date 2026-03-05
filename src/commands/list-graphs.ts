import * as vscode from 'vscode';
import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { ConfigurationProvider, SparqlConnectionService } from '@src/services';
import { SparqlConnection } from '@src/services/sparql-connection';
import { sparqlResultsController } from '@src/views/webviews/sparql-results/sparql-results-controller';

export const listGraphs = {
  id: 'mentor.command.listGraphs',
  handler: async (connection: SparqlConnection): Promise<void> => {
    const configurationProvider = container.resolve<ConfigurationProvider>(InjectionToken.ConfigurationProvider);
    const query = configurationProvider.config().get<string>('sparql.listGraphsQuery');

    if (!query) {
      vscode.window.showErrorMessage('Could not retrieve query from configuration: mentor.sparql.listGraphsQuery');
      return;
    }

    // Create an untitled SPARQL document with the list graphs query
    const document = await vscode.workspace.openTextDocument({
      content: query,
      language: 'sparql'
    });

    const connectionService = container.resolve<SparqlConnectionService>(InjectionToken.SparqlConnectionService);

    // Set the connection for this document
    await connectionService.setQuerySourceForDocument(document.uri, connection.id);

    // Show the document and execute the query
    await vscode.window.showTextDocument(document);
    await sparqlResultsController.executeQueryFromTextDocument(document);
  }
};
