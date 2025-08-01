import * as vscode from 'vscode';
import { NotSupportedError } from '@/utilities/error';

/**
 * Provides a file system provider for the 'mentor' scheme.
 */
export class MentorFileSystemProvider implements vscode.FileSystemProvider {
	static readonly scheme = 'mentor';

	private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		const fileUri = this.resolveWorkspaceRelative(uri);

		return vscode.workspace.fs.stat(fileUri);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		const fileUri = this.resolveWorkspaceRelative(uri);

		return vscode.workspace.fs.readFile(fileUri);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array): void | Thenable<void> {
		const fileUri = this.resolveWorkspaceRelative(uri);

		return vscode.workspace.fs.writeFile(fileUri, content);
	}

	private resolveWorkspaceRelative(uri: vscode.Uri): vscode.Uri {
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folders are open.');
		}

		const segments = [
			uri.authority, // Note: the authority could be used to identify the workspace, if needed.
			uri.path.startsWith('/') ? uri.path.substring(1) : uri.path
		];

		for (const workspaceFolder of workspaceFolders) {
			const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, ...segments);

			return targetUri;
		}

		// If multiple workspace folders, default to the first one
		return vscode.Uri.joinPath(workspaceFolders[0].uri, ...segments);
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
		return [vscode.workspace.registerFileSystemProvider(MentorFileSystemProvider.scheme, this, {
			isCaseSensitive: true,
			isReadonly: false
		})];
	}
}