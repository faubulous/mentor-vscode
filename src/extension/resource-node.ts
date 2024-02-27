import * as vscode from 'vscode';
import { DocumentContext } from '../languages/document-context';
import { getUriFromNodeId, getProviderFromNodeId } from '../utilities';

/**
 * Represents an RDF resource in a tree view.
 */
export class ResourceNode extends vscode.TreeItem {
	contextValue: string = 'resource';

	provider: string;

	uri: string;

	constructor(
		protected readonly context: DocumentContext,
		id: string,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super('');

		this.id = id;
		this.uri = getUriFromNodeId(id);
		this.provider = getProviderFromNodeId(id);
		this.contextValue = 'resource.' + this.provider;
		this.iconPath = this.getIcon();
		this.label = this.getLabel();
		this.description = this.getDescription();
		this.tooltip = this.getTooltip();
		this.command = this.getCommand();
		this.collapsibleState = collapsibleState ?? this.getCollapsibleState();
	}

	/**
	 * Get the command that is executed when the tree item is clicked.
	 * @returns A command that is executed when the tree item is clicked.
	 */
	getCommand(): vscode.Command | undefined {
		return {
			command: 'mentor.action.revealDefinition',
			title: '',
			arguments: [this.id]
		};
	}

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		let label = this.context.getResourceLabel(this.uri);

		return {
			label: label,
			highlights: this.uri.length > 1 ? [[this.uri.length - 2, this.uri.length - 1]] : void 0
		}
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or undefined if no description should be shown.
	 */
	getDescription(): string | undefined {
		return undefined;
	}

	/**
	 * Get the tooltip of the tree item.
	 * @returns A markdown string or undefined if no tooltip should be shown.
	 */
	getTooltip(): vscode.MarkdownString | undefined {
		return this.context.getResourceTooltip(this.uri);
	}

	/**
	 * Get the icon of the tree item.
	 * @returns A theme icon or undefined if no icon should be shown.
	 */
	getIcon(): vscode.ThemeIcon | undefined {
		return new vscode.ThemeIcon('primitive-square', this.getIconColor());
	}

	/**
	 * Get the theme color for the icon of the tree item.
	 * @returns A theme color or undefined for the default icon color.
	 */
	getIconColor(): vscode.ThemeColor | undefined {
		return new vscode.ThemeColor('descriptionForeground');
	}

	/**
	 * Get the collapsible state of the tree item.
	 * @returns The collapsible state of the tree item.
	 */
	getCollapsibleState(): vscode.TreeItemCollapsibleState {
		return vscode.TreeItemCollapsibleState.None;
	}
}