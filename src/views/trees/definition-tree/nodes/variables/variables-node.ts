import * as vscode from 'vscode';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { TreeNode } from '@src/views/trees/tree-node';
import { DefinitionTreeNode } from '../../definition-tree-node';
import { SparqlQueryInfo } from '@src/languages/sparql/services/sparql-query-info';
import { VariableNode } from './variable-node';

/**
 * A tree node that groups all variables of a SPARQL query under a single
 * collapsible "Variables" folder. Shown when `view.showVariablesFolder` is true.
 */
export class VariablesNode extends DefinitionTreeNode {
	private readonly queryInfo: SparqlQueryInfo;

	constructor(context: IDocumentContext, id: string, uri: string, queryInfo: SparqlQueryInfo) {
		super(context, id, uri);
		this.queryInfo = queryInfo;
	}

	override getContextValue(): string {
		return 'variables';
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Variables' };
	}

	override getDescription(): string {
		const count = this.queryInfo.allVariables.length;
		return count.toString();
	}

	override getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('symbol-variable');
	}

	override getIconColor(): vscode.ThemeColor | undefined {
		return undefined;
	}

	override getCommand(): vscode.Command | undefined {
		return undefined;
	}

	override hasChildren(): boolean {
		return this.queryInfo.allVariables.length > 0;
	}

	override getChildren(): TreeNode[] {
		const { allVariables, projectedVariables, type } = this.queryInfo;

		return allVariables.map(varName => {
			const isProjected = type !== RdfToken.SELECT || projectedVariables.includes(varName);
			const id = `${this.id}/variable:${varName}`;
			const uri = `mentor:variable:${varName}`;

			const node = new VariableNode(this.document, id, uri, varName, isProjected);
			node.parent = this;

			return node;
		});
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}
