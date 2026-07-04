import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry, IGraphManagementService, ITripleStoreConfigService } from '@src/languages/sparql/services';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlResultsController } from '@src/views/webviews';

export const listGraphs = {
  id: 'mentor.command.listGraphs',
  handler: async (connection: SparqlConnection): Promise<void> => {
    const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
    const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
    const query = storeConfigService.getQueryTemplate(connection, 'listGraphs');

    if (!query) {
      vscode.window.showErrorMessage('Could not resolve a "list graphs" query for this connection.');
      return;
    }

    const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
    const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

    // Prefer the graphs already cached by the auto-load service to avoid a round-trip;
    // otherwise issue the query against the connection.
    if (graphService.hasGraphsForConnection(connection.id)) {
      await controller.displayGraphList(connection, query, graphService.getGraphsForConnection(connection.id, connectionRegistry.getInferenceEnabled(connection.id)));
    } else {
      await controller.executeBackgroundQuery(connection, query, 'List Graphs');
    }
  }
};
