import * as vscode from 'vscode';
import { mentor, VocabularyContext } from './mentor';

export abstract class ResourceNodeProvider<T> implements vscode.TreeDataProvider<string> {
	protected readonly nodes: any = {};

	protected context: VocabularyContext | undefined;

	protected repository: T | undefined;

	protected showReferenced: boolean = false;

	protected autoRefresh: boolean = true;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.onDidChangeVocabularyContext((context) => this._onVocabularyChanged(context));

		if (mentor.activeContext) {
			this._onVocabularyChanged(mentor.activeContext);
		}
	}

	private _onVocabularyChanged(e: VocabularyContext | undefined): void {
		if (e) {
			this.context = e;
			this.repository = this.getRepository(e);
			this.refresh();
		}
	}

	protected abstract getRepository(context: VocabularyContext): T | undefined;

	toggleReferenced() {
		this.showReferenced = !this.showReferenced;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(void 0);
	}

	select(uri: string) {
		if (this.context && this.context.tokens[uri]) {
			const context = this.context;

			this.activateDocument().then((editor) => {
				// Todo: This only selects the first occurance, but not necessarily the term definition.
				const token = context.tokens[uri].sort((a: any, b: any) => a.start - b.start)[0] as any;
				const text = token.type == 'prefixed' ? `${token.prefix}:${token.value}` : `<${token.value}>`;

				const n = token.line - 1;
				const line = context.document.lineAt(n);
				const start = line.text.indexOf(text);
				const end = start + text.length;

				const range = new vscode.Range(n, start, n, end);

				if (editor) {
					editor.selection = new vscode.Selection(range.start, range.end);
					editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
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