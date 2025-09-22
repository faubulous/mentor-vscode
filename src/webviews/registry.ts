import * as vscode from 'vscode';
import { sparqlResultsWebviewProvider } from './sparql-results/sparql-results-webview-provider';
import { sparqlEndpointController } from './sparql-endpoint/sparql-endpoint-controller';

/**
 * Centralized registration for all webview controllers.
 * Extend this array with new controllers to have them automatically registered.
 */
const controllers = [
  sparqlResultsWebviewProvider,
  sparqlEndpointController,
];

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
