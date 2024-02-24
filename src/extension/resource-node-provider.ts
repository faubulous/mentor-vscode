import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../languages/document-context';

/**
 * A generic tree node provider for RDF resources.
 */
export abstract class ResourceNodeProvider implements vscode.TreeDataProvider<string> {
	/**
	 * The unique identifier of the tree data provider.
	 */
	abstract get id(): string;

	/**
	 * The vocabulary document context.
	 */
	public context: DocumentContext | undefined;

	/**
	 * Indicates whether the tree view should automatically refresh when the vocabulary context changes.
	 */
	protected autoRefresh: boolean = true;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		if (mentor.activeContext) {
			this._onVocabularyChanged(mentor.activeContext);
		}

		mentor.onDidChangeVocabularyContext((context) => {
			this._onVocabularyChanged(context);
		});

		mentor.settings.onDidChange("view.treeLabelStyle", () => {
			this.refresh();
		});
	}

	private _onVocabularyChanged(e: DocumentContext | undefined): void {
		if (e) {
			this.context = e;
			this.onDidChangeVocabularyContext(e);
			this._onDidChangeTreeData.fire(void 0);
		}
	}

	/**
	 * A callback that is called when the vocabulary document context has changed.
	 * @param context The new vocabulary document context.
	 */
	protected onDidChangeVocabularyContext(context: DocumentContext) { }

	/**
	 * Refresh the tree view.
	 */
	refresh(): void {
		this._onVocabularyChanged(this.context);
	}

	/**
	 * Get the title of the tree view.
	 */
	abstract getTitle(): string;

	/**
	 * Get the parent of a tree node.
	 * @param id The tree node identifier.
	 */
	abstract getParent(id: string): string | undefined;

	/**
	 * Get the children of a tree node.
	 * @param id The tree node identifier.
	 */
	abstract getChildren(id: string | undefined): string[];

	/**
	 * Get the tree item for a tree node.
	 * @param id The tree node identifier.
	 */
	abstract getTreeItem(id: string): vscode.TreeItem;

	/**
	 * Get the number of all items in the tree view.
	 */
	abstract getTotalItemCount(): number;
}