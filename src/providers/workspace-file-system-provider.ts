import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { NotSupportedError } from '@src/utilities/error';
import { WorkspaceUri } from '@src/workspace/workspace-uri';

/**
 * Provides a file system provider for the 'workspace' scheme.
 */
export class WorkspaceFileSystemProvider implements vscode.FileSystemProvider {
	private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	constructor() {
		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(WorkspaceUri.uriScheme, this, {
				isCaseSensitive: true,
				isReadonly: false
			})
		);
	}

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		const fileUri = WorkspaceUri.toFileUri(uri);

		return vscode.workspace.fs.stat(fileUri);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		const fileUri = WorkspaceUri.toFileUri(uri);

		return vscode.workspace.fs.readFile(fileUri);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array): void | Thenable<void> {
		const fileUri = WorkspaceUri.toFileUri(uri);

		return vscode.workspace.fs.writeFile(fileUri, content);
	}

	readDirectory(): [string, vscode.FileType][] {
		return [];
	}

	createDirectory(): void {
		throw new NotSupportedError();
	}

	delete(): void {
		throw new NotSupportedError();
	}

	rename(): void {
		throw new NotSupportedError();
	}

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => { });
	}
}