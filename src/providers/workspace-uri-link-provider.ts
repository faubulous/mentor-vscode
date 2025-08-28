import * as vscode from 'vscode';
import { WorkspaceUri } from '@/workspace/workspace-uri';

/**
 * Provides document links for URIs with the 'workspace:' scheme.
 */
export class WorkspaceUriLinkProvider implements vscode.DocumentLinkProvider {

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

  /**
   * Registers the document link provider with VS Code.
   * @returns An array of disposables for the provider.
   */
  register(): vscode.Disposable[] {
    // Register the document link provider for all file schemes and content types.
    return [vscode.languages.registerDocumentLinkProvider({ scheme: 'file' }, this)];
  }
}