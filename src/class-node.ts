import * as vscode from 'vscode';

export class ClassNode extends vscode.TreeItem {
	contextValue = 'class';

	constructor(
		public readonly uri: vscode.Uri,
		public readonly iconPath: vscode.ThemeIcon,
		public readonly label: vscode.TreeItemLabel,
		public readonly tooltip: vscode.MarkdownString,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
		
		this.command = {
			command: 'extension.selectResource',
			title: '',
			arguments: [uri]
		};
	}
}