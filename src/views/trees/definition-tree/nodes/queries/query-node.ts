import * as vscode from 'vscode';
import { RdfToken, TokenType } from '@faubulous/mentor-rdf-parsers';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { TreeNode } from '@src/views/trees/tree-node';
import { DefinitionTreeNode } from '../../definition-tree-node';
import { SparqlQueryInfo } from '@src/languages/sparql/services/sparql-query-info';
import { VariablesNode } from '../variables/variables-node';
import { VariableNode } from '../variables/variable-node';

/**
 * A tree node representing a single SPARQL query or update operation within a
 * `.sparql` document. The node's children are either a `VariablesNode` folder
 * (when `view.showVariablesFolder` is true) or individual `VariableNode` leaves,
 * plus any nested `QueryNode` items for subqueries.
 */
export class QueryNode extends DefinitionTreeNode {
	/** Structural information extracted from the SPARQL source. */
	readonly queryInfo: SparqlQueryInfo;

	/**
	 * @param context  The document context for the open `.sparql` file.
	 * @param id       Unique identifier for this tree node.
	 * @param uri      Synthetic URI for this node (not an RDF resource).
	 * @param queryInfo Structural information about the query.
	 */
	constructor(
		context: IDocumentContext,
		id: string,
		uri: string,
		queryInfo: SparqlQueryInfo
	) {
		super(context, id, uri);
		this.queryInfo = queryInfo;
	}

	override getContextValue(): string {
		return 'query';
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: this.queryInfo.type.name };
	}

	override getDescription(): string {
		const { type, projectedVariables, allVariables } = this.queryInfo;
		const allCount = allVariables.length;

		if (type === RdfToken.SELECT) {
			const projectedCount = projectedVariables.length;

			if (allCount === projectedCount) {
				return projectedCount > 0 ? `${projectedCount} variable${projectedCount === 1 ? '' : 's'}` : '';
			} else {
				return `${projectedCount} / ${allCount} variable${allCount === 1 ? '' : 's'}`;
			}
		} else {
			return allCount > 0 ? `${allCount} variable${allCount === 1 ? '' : 's'}` : '';
		}
	}

	override getIcon(): vscode.ThemeIcon {
		let icon = 'symbol-method';

		switch (this.queryInfo.type.name) {
			case RdfToken.SELECT.name:
				icon = 'table'; break;
			case RdfToken.CONSTRUCT.name:
				icon = 'type-hierarchy'; break;
			case RdfToken.ASK.name:
				icon = 'question'; break;
			case RdfToken.DESCRIBE.name:
				icon = 'info'; break;
			case RdfToken.INSERT.name:
				icon = 'add'; break;
			case RdfToken.DELETE_KW.name:
				icon = 'remove'; break;
		}

		return new vscode.ThemeIcon(icon);
	}

	override getIconColor(): vscode.ThemeColor | undefined {
		return undefined;
	}

	override getCommand(): vscode.Command {
		return {
			command: 'vscode.open',
			title: '',
			arguments: [
				this.document.uri,
				{ selection: new vscode.Range(this.queryInfo.startLine, 0, this.queryInfo.startLine, 0) }
			]
		};
	}

	override hasChildren(): boolean {
		const { allVariables, subqueries } = this.queryInfo;

		return allVariables.length > 0 || subqueries.length > 0;
	}

	override getChildren(): TreeNode[] {
		const { allVariables, projectedVariables, subqueries, type, startLine } = this.queryInfo;
		const showFolder = this.settings.get('view.showVariablesFolder', true);

		const children: TreeNode[] = [];

		// Subqueries come first
		for (let i = 0; i < subqueries.length; i++) {
			const sub = subqueries[i];
			const subId = `${this.id}/subquery:${sub.startLine}`;
			const subUri = `mentor:subquery:${sub.startLine}`;
			const subNode = new QueryNode(this.document, subId, subUri, sub);
			subNode.parent = this;

			children.push(subNode);
		}

		if (allVariables.length === 0) {
			return children;
		}

		if (showFolder) {
			const folderId = `${this.id}/variables`;
			const folderUri = `mentor:variables:${startLine}`;
			const folder = new VariablesNode(this.document, folderId, folderUri, this.queryInfo);
			folder.parent = this;

			children.push(folder);
		} else {
			for (const varName of allVariables) {
				const isProjected = type !== RdfToken.SELECT || projectedVariables.includes(varName);
				const varId = `${this.id}/variable:${varName}`;
				const varUri = `mentor:variable:${varName}`;
				const varNode = new VariableNode(this.document, varId, varUri, varName, isProjected);
				varNode.parent = this;

				children.push(varNode);
			}
		}

		return children;
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}
