import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../languages/document-context';
import { getNodeIdFromUri, getUriFromNodeId } from '../utilities';

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
	 * Sort the URIs by their labels according to the current label display settings.
	 * @param uris A list of URIs.
	 * @returns The URIs sorted by their labels.
	 */
	protected sortByLabel(uris: string[]): string[] {
		return uris
			.map(uri => ({
				uri: uri,
				label: this.context!.getResourceLabel(uri)
			}))
			.sort((a, b) => a.label.localeCompare(b.label))
			.map(x => x.uri);
	}

	/**
	 * Get the URI of a tree node.
	 * @param id A tree node identifier.
	 * @returns A URI without the tree node identifier prefix.
	 */
	protected getUri(id: string | undefined): string | undefined {
		return id ? getUriFromNodeId(id) : undefined;
	}

	/**
	 * Get the tree node identifier of a URI.
	 * @param uri A URI.
	 * @returns A tree node identifier with the identifier prefix.
	 */
	protected getId(uri: string): string {
		return getNodeIdFromUri(this.id, uri);
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