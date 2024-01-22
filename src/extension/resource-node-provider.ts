import * as vscode from 'vscode';
import { mentor, DocumentContext } from '../mentor';

export abstract class ResourceNodeProvider<T> implements vscode.TreeDataProvider<string> {
	public context: DocumentContext | undefined;

	protected repository: T | undefined;

	protected autoRefresh: boolean = true;

	public selectedNode: string | undefined;

	protected readonly nodeCache = new Map<string, vscode.TreeItem>();

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
			this.onDidChangeVocabularyContext(e);
			this._onDidChangeTreeData.fire(void 0);
		}
	}

	protected abstract onDidChangeVocabularyContext(context: DocumentContext): void;

	refresh(): void {
		if (this.context) {
			this._onVocabularyChanged(this.context);
		}
	}

	select(uri: string) {
		this.selectedNode = uri;
	}

	abstract getParent(uri: string): string | undefined;

	abstract getChildren(uri: string): string[];

	abstract getTreeItem(uri: string): vscode.TreeItem;

	abstract getTotalItemCount(): number;
}