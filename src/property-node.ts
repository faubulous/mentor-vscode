import * as vscode from 'vscode';

export class PropertyNode extends vscode.TreeItem {
	contextValue = 'property';

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
			command: 'mentor.propertyExplorer.command.selectEntry',
			title: '',
			arguments: [uri]
		};
	}
}