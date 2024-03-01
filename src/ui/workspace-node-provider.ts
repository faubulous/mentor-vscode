import * as vscode from 'vscode';
import * as path from 'path';

/**
 * A tree node provider for RDF files in the Visual Studio Code workspace.
 */
export class WorkspaceNodeProvider implements vscode.TreeDataProvider<vscode.Uri> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.Uri | undefined> = new vscode.EventEmitter<vscode.Uri | undefined>();

	readonly onDidChangeTreeData: vscode.Event<vscode.Uri | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		vscode.workspace.onDidCreateFiles(() => this._onDidChangeTreeData.fire(undefined));
		vscode.workspace.onDidDeleteFiles(() => this._onDidChangeTreeData.fire(undefined));
		vscode.workspace.onDidRenameFiles(() => this._onDidChangeTreeData.fire(undefined));
	}

	getParent(id: vscode.Uri): vscode.Uri | undefined {
		return undefined;
	}

	async getChildren(id: vscode.Uri): Promise<vscode.Uri[]> {
		if (!vscode.workspace.name || !vscode.workspace.workspaceFolders?.length) {
			return [];
		}

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isLoading', true);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', true);

		let workspace = id ?? vscode.workspace.workspaceFolders[0].uri;
		let extensions = /\.ttl$|\.nt$|\.owl$|\.trig$|\.nq$|\.n3|\.sparql$/;
		let exclude = /node_modules/;

		let result = await this._findMatchingFilesOrFolders(workspace, extensions, exclude);

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isLoading', false);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', result.length === 0);

		return result;
	}

	private async _findMatchingFilesOrFolders(folderUri: vscode.Uri, include: RegExp, exclude: RegExp): Promise<vscode.Uri[]> {
		const result: { uri: vscode.Uri, isDirectory: boolean }[] = [];

		for (const entry of await vscode.workspace.fs.readDirectory(folderUri)) {
			const uri = vscode.Uri.joinPath(folderUri, entry[0]);
			const path = entry[0];
			const type = entry[1];

			if (exclude.test(path)) {
				continue;
			} else if (type === vscode.FileType.Directory && await this._hasMatchingFiles(uri, include)) {
				result.push({ uri: uri, isDirectory: true });
			} else if (include.test(uri.path)) {
				result.push({ uri: uri, isDirectory: false });
			}
		}

		return result.sort((a, b) => {
			if (a.isDirectory && !b.isDirectory) {
				return -1;
			}

			if (!a.isDirectory && b.isDirectory) {
				return 1;
			}

			return a.uri.path.localeCompare(b.uri.path);
		}).map(r => r.uri);
	}

	private async _hasMatchingFiles(uri: vscode.Uri, regex: RegExp): Promise<boolean> {
		const entries = await vscode.workspace.fs.readDirectory(uri);

		for (const entry of entries) {
			const path = entry[0];
			const type = entry[1];

			if (type === vscode.FileType.Directory) {
				if (await this._hasMatchingFiles(vscode.Uri.joinPath(uri, path), regex)) {
					return true;
				}
			} else if (regex.test(path)) {
				return true;
			}
		}

		return false;
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