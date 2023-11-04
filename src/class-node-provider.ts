import * as vscode from 'vscode';
import * as n3 from 'n3';
import { VocabularyContext } from './mentor';
import { ClassRepository, rdfs, skos } from '@faubulous/mentor-rdf';
import { ClassNode } from './class-node';
import { getNamespaceUri, toJsonId } from './uri-helper';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF classes.
 */
export class ClassNodeProvider extends ResourceNodeProvider<ClassRepository> {

	override getRepository(context: VocabularyContext): ClassRepository | undefined {
		return new ClassRepository(context.store);
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result = this.repository.getSubClasses(uri).sort().map(u => this.getNode(u));

		if (!this.showReferenced) {
			result = result.filter(u => this.repository?.hasSubject(u));
		}

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (!this.repository) {
			throw new Error('Invalid repostory.');
		}

		const collapsible = this.repository.hasSubClasses(uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;

		// const workbench = vscode.workspace.getConfiguration("workbench");

		// const colorCustomizations: any = workbench.get("colorCustomizations");

		// workbench.update(
		// 	"colorCustomizations",
		// 	{
		// 		...colorCustomizations,
		// 		"rdf.ns0": "#006EAE",
		// 	},
		// 	1,
		// );

		return new ClassNode(
			vscode.Uri.parse(uri),
			this._getNodeIcon(uri),
			this._getNodeLabel(uri),
			this._getNodeDescription(uri),
			collapsible
		);
	}

	private _getNodeLabel(uri: string): vscode.TreeItemLabel {
		let label: string;
		let n = uri.lastIndexOf('#');

		if (n > -1) {
			label = uri.substring(n + 1);
		} else {
			label = uri.substring(uri.lastIndexOf('/') + 1);
		}

		return {
			label: label,
			highlights: uri.length > 1 ? [[uri.length - 2, uri.length - 1]] : void 0
		}
	}

	private _getNodeDescription(uri: string): vscode.MarkdownString {
		let result = '';

		if (this.context) {
			const s = n3.DataFactory.namedNode(uri);

			for (let d of this.context.store.match(s, skos.definition, null, null)) {
				result += d.object.value;
				break;
			}

			if (!result) {
				for (let d of this.context.store.match(s, rdfs.comment, null, null)) {
					result += d.object.value;
					break;
				}
			}
		}

		if (result) {
			result += '\n\n';
		}

		result += uri;

		return new vscode.MarkdownString(result, true);
	}

	private _getNodeIcon(uri: string) {
		const id = toJsonId(getNamespaceUri(uri));
		const color = new vscode.ThemeColor('mentor.color.' + id);

		let icon = 'rdf-class';

		if (!this.repository) {
			return new vscode.ThemeIcon(icon, color);
		}

		if (!this.repository.hasSubject(uri)) {
			icon += '-ref';
		}

		if (this.repository.hasEquivalentClass(uri)) {
			icon += '-eq';
		}

		return new vscode.ThemeIcon(icon, color);
	}
}