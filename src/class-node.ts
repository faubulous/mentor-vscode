import * as vscode from 'vscode';

export class ClassNode extends vscode.TreeItem {
	contextValue = 'class';

	constructor(
		public readonly uri: vscode.Uri,
		public readonly label: vscode.TreeItemLabel,
		public readonly iconPath: vscode.ThemeIcon,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = new vscode.MarkdownString(uri.toString(), true);
		this.description = "Class";
		this.command = {
			command: 'extension.selectResource',
			title: '',
			arguments: [uri]
		};
	}
}