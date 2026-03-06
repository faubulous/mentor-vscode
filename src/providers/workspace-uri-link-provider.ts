import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WorkspaceUri } from '@src/workspace/workspace-uri';

/**
 * Provides document links for URIs with the 'workspace:' scheme.
 */
export class WorkspaceUriLinkProvider implements vscode.DocumentLinkProvider {

  constructor() {
    // Self-register with the extension context for automatic disposal
    const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
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

      if (uri) {
        links.push(new vscode.DocumentLink(range, uri));
      }
    }

    return links;
  }
}