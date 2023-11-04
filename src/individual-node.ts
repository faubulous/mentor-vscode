import * as vscode from 'vscode';

export class IndividualNode extends vscode.TreeItem {
	contextValue = 'individual';

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
			command: 'mentor.individualExplorer.command.selectEntry',
			title: '',
			arguments: [uri]
		};
	}
}