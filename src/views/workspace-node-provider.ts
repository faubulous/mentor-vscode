import * as path from 'path';
import * as vscode from 'vscode';
import * as mentor from '../mentor';

// See: https://github.com/boltex/revealRangeTest/blob/main/src/fileExplorer.ts#L185

/**
 * A tree node provider for RDF files in the Visual Studio Code workspace.
 */
export class WorkspaceNodeProvider implements vscode.FileSystemProvider {

	private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;

	constructor() {}

	watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
		return mentor.workspace.onDidChangeWorkspaceFolder((e) => {
			this._onDidChangeFile.fire([e]);
		});
	}

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		throw new Error('Method not implemented.');
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		throw new Error('Method not implemented.');
	}

	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		throw new Error('Method not implemented.');
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}

	delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}

	copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}

	getParent(id: vscode.Uri): vscode.Uri | undefined {
		return undefined;
	}

	async getChildren(id: vscode.Uri): Promise<vscode.Uri[]> {
		if (!vscode.workspace.name || !vscode.workspace.workspaceFolders?.length) {
			return [];
		}

		let result = [];

		if (id == null) {
			await mentor.workspace.waitForInitialized();

			result = mentor.workspace.rootItems;
		} else {
			result = await mentor.workspace.getFolderContents(id);
		}

		return result.map((item) => item.uri);
	}

	getTreeItem(id: vscode.Uri): vscode.TreeItem {
		const isDirectory = path.extname(id.path) == '';

		const item = new vscode.TreeItem(id);
		item.collapsibleState = isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

		if (!isDirectory) {
			item.command = {
				command: 'vscode.open',
				arguments: [id],
				title: 'Open File'
			};
		}

		return item;
	}

	getTotalItemCount(): number {
		return 0;
	}
}