import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from './sparql-results/sparql-results-controller';
import { sparqlConnectionController } from './sparql-connection/sparql-connection-controller';

/**
 * Centralised register of all webview controllers. Extend this array with 
 * new controllers to have them automatically registered.
 */
const controllers = [
  sparqlResultsWebviewProvider,
  sparqlConnectionController,
];

/**
 * Register all webview controllers.
 * @param context The extension context to register with.
 * @returns An array of disposables for the registered controllers.
 */
export function registerAll(context: vscode.ExtensionContext): vscode.Disposable[] {
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

export { controllers };
