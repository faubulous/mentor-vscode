import * as vscode from 'vscode';
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
   * @param context The extension context to register with.
   * @returns An array of disposables for the registered controllers.
   */
  registerAll: (context: vscode.ExtensionContext): vscode.Disposable[] => {
    const disposables: vscode.Disposable[] = [];

    for (const c of controllers) {
      const d = c.register(context);

      if (Array.isArray(d)) {
        disposables.push(...d);
      } else {
        disposables.push(d);
      }
    }

    return disposables;
  }
};
