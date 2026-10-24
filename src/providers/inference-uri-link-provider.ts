import * as vscode from 'vscode';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * Provides document links for URIs with the 'inference:' scheme.
 */
export class InferenceUriLinkProvider implements vscode.DocumentLinkProvider {

  constructor(context: vscode.ExtensionContext) {
    // Self-register with the extension context for automatic disposal
    context.subscriptions.push(
      vscode.languages.registerDocumentLinkProvider({ scheme: 'file' }, this)
    );
  }

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // The provider runs for every file in every language; skip the regex scan when no
    // inference URI can occur, which is the case for almost every document.
    if (!text.includes(InferenceUri.queryAppendix)) {
      return links;
    }

    const regex = new RegExp(InferenceUri.uriRegex, 'g');

    for (const match of text.matchAll(regex)) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);

      const range = new vscode.Range(start, end);
      const uri = vscode.Uri.parse(match[0]);

      if (uri) {
        links.push(new vscode.DocumentLink(range, uri));
      }
    }

    return links;
  }
}