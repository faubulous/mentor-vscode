/**
 * The tree view interface.
 */
export interface TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id: string;

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider: any;

	/**
	 * The tree view.
	 */
	readonly treeView: any;
}