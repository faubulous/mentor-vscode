import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { sparqlResultsController } from './sparql-results/sparql-results-controller';
import { sparqlConnectionController } from './sparql-connection/sparql-connection-controller';
import { sparqlConnectionsListController } from './sparql-connections-list/sparql-connections-list-controller';

/**
 * Centralized register of all webview controllers. Extend this array with 
 * new controllers to have them automatically registered.
 */
export const controllers = [
  sparqlResultsController,
  sparqlConnectionController,
  sparqlConnectionsListController,
];

export const webviewRegistry = {
  /**
   * Register all webview controllers.
   * Self-registers with the extension context for automatic disposal.
   */
  registerAll: (): void => {
    const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);

    for (const c of controllers) {
      const d = c.register(context);

      if (Array.isArray(d)) {
        context.subscriptions.push(...d);
      } else {
        context.subscriptions.push(d);
      }
    }
  }
};
