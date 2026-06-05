import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlResultsController } from '@src/views/webviews';

export const listGraphs = {
  id: 'mentor.command.listGraphs',
  handler: async (connection: SparqlConnection): Promise<void> => {
    const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
    const query = connectionService.getQueryTemplate(connection, 'listGraphs');

    if (!query) {
      vscode.window.showErrorMessage('Could not resolve a "list graphs" query for this connection.');
      return;
    }

    const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
    await controller.executeBackgroundQuery(connection, query, 'List Graphs');
  }
};
