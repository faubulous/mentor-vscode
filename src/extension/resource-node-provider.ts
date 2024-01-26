import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { DocumentContext } from '../document-context';
import { ResourceRepository } from '@faubulous/mentor-rdf';

export abstract class ResourceNodeProvider<T extends ResourceRepository> implements vscode.TreeDataProvider<string> {
	public context: DocumentContext<T> | undefined;

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

	private _onVocabularyChanged(e: DocumentContext<T> | undefined): void {
		if (e) {
			this.context = e;
			this.onDidChangeVocabularyContext(e);
			this._onDidChangeTreeData.fire(void 0);
		}
	}

	protected onDidChangeVocabularyContext(context: DocumentContext<T>) {}

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