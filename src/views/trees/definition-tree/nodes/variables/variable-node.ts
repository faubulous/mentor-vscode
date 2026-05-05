import * as vscode from 'vscode';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { TreeNode } from '@src/views/trees/tree-node';
import { DefinitionTreeNode } from '../../definition-tree-node';

/**
 * A leaf node representing a single SPARQL variable within a query.
 *
 * For SELECT queries, variables that are explicitly projected in the SELECT
 * clause are shown normally. Variables that appear only in the WHERE clause
 * (not projected) are shown with a muted description color.
 *
 * For non-SELECT queries (CONSTRUCT, ASK, DESCRIBE, UPDATE), all variables
 * are treated uniformly as projected.
 */
export class VariableNode extends DefinitionTreeNode {
	/** The variable name including the leading `?` or `$` character. */
	private readonly variableName: string;

	/**
	 * Whether this variable appears in the SELECT projection (or is from a
	 * non-SELECT query where the distinction does not apply).
	 */
	private readonly isProjected: boolean;

	constructor(
		context: IDocumentContext,
		id: string,
		uri: string,
		variableName: string,
		isProjected: boolean
	) {
		super(context, id, uri);
		this.variableName = variableName;
		this.isProjected = isProjected;
	}

	override getContextValue(): string {
		return 'variable';
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: this.variableName };
	}

	override getDescription(): string {
		return this.isProjected ? '' : 'WHERE only';
	}

	override getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('symbol-variable');
	}

	override getIconColor(): vscode.ThemeColor | undefined {
		return this.isProjected
			? undefined
			: new vscode.ThemeColor('descriptionForeground');
	}

	override getCommand(): vscode.Command | undefined {
		return undefined;
	}

	override hasChildren(): boolean {
		return false;
	}

	override getChildren(): TreeNode[] {
		return [];
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}
