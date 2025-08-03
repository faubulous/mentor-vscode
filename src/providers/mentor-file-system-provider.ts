import * as vscode from 'vscode';
import { NotSupportedError } from '@/utilities/error';
import { WorkspaceVfs } from '@/workspace-vfs';

/**
 * Provides a file system provider for the 'mentor' scheme.
 */
export class MentorFileSystemProvider implements vscode.FileSystemProvider {
	private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		const fileUri = WorkspaceVfs.toFileUri(uri);

		return vscode.workspace.fs.stat(fileUri);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		const fileUri = WorkspaceVfs.toFileUri(uri);

		return vscode.workspace.fs.readFile(fileUri);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array): void | Thenable<void> {
		const fileUri = WorkspaceVfs.toFileUri(uri);

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

	register(): vscode.Disposable[] {
		return [vscode.workspace.registerFileSystemProvider(WorkspaceVfs.uriScheme, this, {
			isCaseSensitive: true,
			isReadonly: false
		})];
	}
}