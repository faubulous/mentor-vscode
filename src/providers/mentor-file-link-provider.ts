import * as vscode from 'vscode';
import { MentorFileSystemProvider } from './mentor-file-system-provider';

/**
 * Provides document links for URIs with the 'mentor:' scheme.
 */
export class MentorFileLinkProvider implements vscode.DocumentLinkProvider {

  readonly _uriRegex = new RegExp(`${MentorFileSystemProvider.scheme}://[^\\s>]+`, 'g');

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    for (const match of text.matchAll(this._uriRegex)) {
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

  register(): vscode.Disposable[] {
    // Register the document link provider for all file schemes and content types.
    return [vscode.languages.registerDocumentLinkProvider({ scheme: 'file' }, this)];
  }
}