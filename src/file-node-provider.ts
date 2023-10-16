import * as vscode from 'vscode';

export class FileNodeProvider implements vscode.TreeDataProvider<string> {
	protected readonly nodes: any = {};

	private editor: vscode.TextEditor | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e));
		vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());

		this.onActiveEditorChanged();
	}

	private onActiveEditorChanged(): void {
		this.editor = vscode.window.activeTextEditor;
	}

	private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
	}

	refresh(offset?: number): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getChildren(uri: string): string[] {
		return [];
	}

	getTreeItem(uri: string): vscode.TreeItem {
		return new vscode.TreeItem('');
	}

	select(uri: string) {
	}

	getParent(uri: string): string | undefined {
		return undefined;
	}

	getNode(uri: string): string {
		if (!this.nodes[uri]) {
			this.nodes[uri] = uri;
		}

		return this.nodes[uri];
	}
}