import * as vscode from 'vscode';
import { mentor, VocabularyContext } from './mentor';

export abstract class TreeNodeProvider<T> implements vscode.TreeDataProvider<string> {
	protected readonly nodes: any = {};

	protected context: VocabularyContext | undefined;

	protected repository: T | undefined;

	protected showReferenced: boolean = false;

	protected autoRefresh: boolean = true;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.onDidChangeDocumentContext((context) => this.onDocumentContextChanged(context));

		if(mentor.activeContext) {
			this.onDocumentContextChanged(mentor.activeContext);
		}
	}

	protected abstract onDocumentContextChanged(e: VocabularyContext | undefined): void;

	protected onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
		// if (this.autoRefresh && changeEvent.document.uri === this.editor?.document.uri) {
		// 	for (const change of changeEvent.contentChanges) {
		// 		console.warn(change);

		// 		// const path = json.getLocation(this.text, this.editor.document.offsetAt(change.range.start)).path;
		// 		// path.pop();
		// 		// const node = path.length ? json.findNodeAtLocation(this.tree, path) : void 0;
		// 		// this.parseTree();
		// 		// this._onDidChangeTreeData.fire(node ? node.offset : void 0);

		// 		this._onDidChangeTreeData.fire(void 0);
		// 	}
		// }
	}

	toggleReferenced() {
		this.showReferenced = !this.showReferenced;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(void 0);
	}

	select(uri: string) {
		if (vscode.window.activeTextEditor && this.context && this.context.tokens[uri]) {
			const tokens = this.context.tokens;

			this.activateDocument().then((editor) => {
				const t = tokens[uri].sort((a: any, b: any) => a.start - b.start)[0] as any;
				const r = new vscode.Range(t.line - 1, t.start, t.line - 1, t.end);

				if (editor) {
					editor.selection = new vscode.Selection(r.start, r.end);
					editor.revealRange(r, vscode.TextEditorRevealType.InCenter);
				}
			});
		}
	}

	private async activateDocument(): Promise<vscode.TextEditor | undefined> {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor?.document != this.context?.document) {
			await vscode.commands.executeCommand<vscode.TextDocumentShowOptions>("vscode.open", this.context?.document.uri);
		}

		return activeTextEditor;
	}

	getNode(uri: string): string {
		if (!this.nodes[uri]) {
			this.nodes[uri] = uri;
		}

		return this.nodes[uri];
	}

	abstract getParent(uri: string): string | undefined;

	abstract getChildren(uri: string): string[];

	abstract getTreeItem(uri: string): vscode.TreeItem;
}