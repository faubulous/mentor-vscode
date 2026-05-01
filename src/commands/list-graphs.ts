import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlResultsController } from '@src/views/webviews';
import { getConfig } from '@src/utilities/vscode/config';

export const listGraphs = {
  id: 'mentor.command.listGraphs',
  handler: async (connection: SparqlConnection): Promise<void> => {
    const query = getConfig().get<string>('sparql.listGraphsQuery');

    if (!query) {
      vscode.window.showErrorMessage('Could not retrieve query from configuration: mentor.sparql.listGraphsQuery');
      return;
    }

    const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
    await controller.executeBackgroundQuery(connection, query, 'List Graphs');
  }
};
