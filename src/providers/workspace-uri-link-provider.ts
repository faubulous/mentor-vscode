import * as vscode from 'vscode';
import { WorkspaceUri } from './workspace-uri';

/**
 * Provides document links for URIs with the 'workspace:' scheme.
 */
export class WorkspaceUriLinkProvider implements vscode.DocumentLinkProvider {

  constructor(context: vscode.ExtensionContext) {
    // Self-register with the extension context for automatic disposal
    context.subscriptions.push(
      vscode.languages.registerDocumentLinkProvider({ scheme: 'file' }, this)
    );
  }

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();
    const regex = new RegExp(WorkspaceUri.uriRegex, 'g');

    for (const match of text.matchAll(regex)) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);

      const range = new vscode.Range(start, end);
      const uri = vscode.Uri.parse(match[0]);

      // Only offer the link if it resolves to a file inside the workspace root. This stops a
      // crafted document from turning `workspace:///../../etc/passwd` into a clickable link that
      // would read (or, on save, write) a file outside the workspace.
      if (uri && WorkspaceUri.tryToFileUri(uri)) {
        links.push(new vscode.DocumentLink(range, uri));
      }
    }

    return links;
  }
}