import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../document-context';

export abstract class ResourceNodeProvider implements vscode.TreeDataProvider<string> {
	public context: DocumentContext | undefined;

	protected autoRefresh: boolean = true;

	public selectedNode: string | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.onDidChangeTreeLabelSettings(() => {
			this.refresh();
		});

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

	protected onDidChangeVocabularyContext(context: DocumentContext) { }

	refresh(): void {
		this._onVocabularyChanged(this.context);
	}

	select(uri: string) {
		this.selectedNode = uri;
	}

	abstract getParent(uri: string): string | undefined;

	abstract getChildren(uri: string): string[];

	abstract getTreeItem(uri: string): vscode.TreeItem;

	abstract getTotalItemCount(): number;
}