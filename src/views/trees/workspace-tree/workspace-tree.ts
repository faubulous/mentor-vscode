import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { TreeView } from '@src/views/trees/tree-view';
import { renameWorkspaceItem } from '@src/commands/rename-workspace-item';
import { WorkspaceNodeProvider } from './workspace-node-provider';

export class WorkspaceTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.workspaceTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new WorkspaceNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<string>;

	constructor() {
		this.treeView = vscode.window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.treeView.title = vscode.workspace.name ?? "Workspace";

		const disposables = [
			this.treeView,
			vscode.commands.registerCommand('mentor.command.refreshWorkspaceTree', async () => {
				this.treeDataProvider.refresh();
			}),
			vscode.commands.registerCommand(renameWorkspaceItem.id, async (clicked?: string) => {
				// Context menu invocations pass the clicked node; the F2 keybinding
				// passes nothing, so fall back to the current tree selection.
				const target = clicked ?? this.treeView.selection[0];

				if (target) {
					await renameWorkspaceItem.handler(target);
				}
			})
		];

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(...disposables);
	}
}