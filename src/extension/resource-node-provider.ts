import * as vscode from 'vscode';
import { mentor, DocumentContext } from '../mentor';

export abstract class ResourceNodeProvider<T> implements vscode.TreeDataProvider<string> {
	protected readonly nodes: any = {};

	public context: DocumentContext | undefined;

	protected repository: T | undefined;

	protected autoRefresh: boolean = true;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.onDidChangeVocabularyContext((context) => {
			this._onVocabularyChanged(context);
		});

		if (mentor.activeContext) {
			this._onVocabularyChanged(mentor.activeContext);
		}
	}

	private _onVocabularyChanged(e: DocumentContext | undefined): void {
		if (e) {
			this.context = e;
			this.repository = this.getRepository(e);
			this._onDidChangeTreeData.fire(void 0);
		}
	}

	protected abstract getRepository(context: DocumentContext): T | undefined;

	refresh(): void {
		if (this.context) {
			this._onVocabularyChanged(this.context);
		}
	}

	select(uri: string) {
		if (this.context) {
			const context = this.context;

			this.activateDocument().then((editor) => {
				let t;

				if (context.typeAssertions[uri]) {
					t = context.typeAssertions[uri][0];
				} else if (context.references[uri]) {
					t = context.references[uri][0];
				} else {
					return;
				}

				const startLine = t.startLine ? t.startLine - 1 : 0;
				const startCharacter = t.startColumn ? t.startColumn - 1 : 0;
				const endLine = t.endLine ? t.endLine - 1 : 0;
				const endCharacter = t.endColumn ?? 0;

				const range = new vscode.Range(startLine, startCharacter, endLine, endCharacter);

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

	abstract getTotalItemCount(): number;
}