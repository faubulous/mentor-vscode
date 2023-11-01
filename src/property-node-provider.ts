import * as vscode from 'vscode';
import * as n3 from 'n3';
import { PropertyRepository, rdfs, skos, xsd } from '@faubulous/mentor-rdf';
import { PropertyNode } from './property-node';
import { getNamespaceUri, toJsonId } from './uri-helper';
import { TreeNodeProvider } from './tree-node-provider';

/**
 * A tree node provider for RDF properties.
 */
export class PropertyNodeProvider extends TreeNodeProvider<PropertyRepository> {

	protected override onStoreInitialized(): void {
		if (this.context) {
			this.repository = new PropertyRepository(this.context.store);

			this.refresh();
		}
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result = this.repository.getSubProperties(uri).sort().map(u => this.getNode(u));

		if (!this.showReferenced) {
			result = result.filter(u => this.repository?.hasSubject(u));
		}

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (!this.repository) {
			throw new Error('Invalid repostory.');
		}

		if (!this.editor) {
			throw new Error('Invalid editor.');
		}

		const collapsible = this.repository.hasSubProperties(uri) ?
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

		return new PropertyNode(
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

		let icon = 'arrow-right';

		if (!this.repository) {
			return new vscode.ThemeIcon(icon, color);
		}

		const range = this.repository.getRange(uri);

		switch (range) {
			case xsd.date.id:
			case xsd.dateTime.id: {
				icon = 'calendar';
				break;
			}
			case xsd.byte.id:
			case xsd.decimal.id:
			case xsd.double.id:
			case xsd.float.id:
			case xsd.int.id:
			case xsd.integer.id:
			case xsd.short.id:
			case xsd.unsignedInt.id:
			case xsd.unsignedShort.id:
			case xsd.unsingedLong.id:
			case xsd.usignedByte.id: {
				icon = 'symbol-number';
				break;
			}
			case xsd.boolean.id: {
				icon = 'symbol-boolean';
				break;
			}
			case xsd.string.id: {
				icon = 'symbol-text';
				break;
			}
			case xsd.base64Binary.id: {
				icon = 'file-binary';
				break;
			}
		}

		return new vscode.ThemeIcon(icon, color);
	}
}