import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { Uri } from '@faubulous/mentor-rdf';
import { OWL, RDF, RDFS, SKOS } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';
import { DefinitionTreeNode } from './definition-tree-node';
import { ClassNode } from './nodes/class-node';
import { OntologyNode } from './nodes/ontology-node';
import { PropertyNode } from './nodes/property-node';
import { IndividualNode } from './nodes/individual-node';
import { ConceptSchemeNode } from './nodes/concept-scheme-node';
import { ConceptNode } from './nodes/concept-node';

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class DefinitionNodeProvider implements vscode.TreeDataProvider<DefinitionTreeNode> {
	/**
	 * The vocabulary document context.
	 */
	public context: DocumentContext | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<DefinitionTreeNode | undefined> = new vscode.EventEmitter<DefinitionTreeNode | undefined>();

	readonly onDidChangeTreeData: vscode.Event<DefinitionTreeNode | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		if (mentor.activeContext) {
			this._onVocabularyChanged(mentor.activeContext);
		}

		mentor.onDidChangeVocabularyContext((context) => {
			this._onVocabularyChanged(context);
		});

		mentor.settings.onDidChange("view.treeLabelStyle", () => {
			this.refresh();
		});
	}

	private _onVocabularyChanged(e: DocumentContext | undefined): void {
		if (e) {
			this.context = e;
			this.onDidChangeVocabularyContext(e);
			this._onDidChangeTreeData.fire(void 0);
		}
	}

	/**
	 * A callback that is called when the vocabulary document context has changed.
	 * @param context The new vocabulary document context.
	 */
	protected onDidChangeVocabularyContext(context: DocumentContext) { }

	/**
	 * Refresh the tree view.
	 */
	refresh(): void {
		this._onVocabularyChanged(this.context);
	}

	getParent(node: DefinitionTreeNode): DefinitionTreeNode | null | undefined {
		throw new Error('Method not implemented.');
	}

	getChildren(node: DefinitionTreeNode): DefinitionTreeNode[] | null | undefined {
		if (!this.context) {
			return [];
		}

		let result: DefinitionTreeNode[] = [];

		if (!node) {
			const ontologyUris = new Set<string>(mentor.vocabulary.getOntologies(this.context.graphs));
			const ontologyNodes = [];

			for (let ontology of ontologyUris) {
				ontologyNodes.push(new OntologyNode(this.context, `<${ontology}>`, ontology, { definedBy: ontology }));
			}

			const schemeUris = new Set<string>(mentor.vocabulary.getConceptSchemes(this.context.graphs));
			const schemeNodes = [];

			for (let scheme of schemeUris) {
				schemeNodes.push(new ConceptSchemeNode(this.context, `<${scheme}>`, scheme));
			}

			const sourceUris = mentor.vocabulary.getDefinitionSources(this.context.graphs);
			const sourceNodes = [];

			for (let source of sourceUris) {
				if(ontologyUris.has(source) || ontologyUris.has(Uri.getNormalizedUri(source))) {
					continue;
				}

				sourceNodes.push(new OntologyNode(this.context, `<${source}>`, source, { definedBy: source }));
			}

			result = [
				...this.sortByLabel(ontologyNodes),
				...this.sortByLabel(schemeNodes),
				...this.sortByLabel(sourceNodes)
			];

			let hasUndefined = false;

			for (let _ of mentor.vocabulary.getClasses(this.context.graphs, { definedBy: null })) {
				hasUndefined = true;
				break;
			}

			for (let _ of mentor.vocabulary.getProperties(this.context.graphs, { definedBy: null })) {
				hasUndefined = true;
				break;
			}

			for (let _ of mentor.vocabulary.getIndividuals(this.context.graphs, undefined, { definedBy: null })) {
				hasUndefined = true;
				break;
			}

			if (hasUndefined) {
				result.push(new OntologyNode(this.context, '<>', undefined, { definedBy: null }));
			}
		} else if (node.type === OWL.Ontology) {
			const options = { ...node.options };

			result.push(new ClassNode(this.context, node.id + '/classes', undefined, options));
			result.push(new PropertyNode(this.context, node.id + '/properties', undefined, options));
			result.push(new IndividualNode(this.context, node.id + '/individuals', undefined, options));
		} else if (node.type === RDFS.Class) {
			for (let c of mentor.vocabulary.getSubClasses(this.context.graphs, node.uri, node.options)) {
				result.push(new ClassNode(this.context, node.id + `/<${c}>`, c, node.options));
			}

			result = this.sortByLabel(result);
		} else if (node.type === RDF.Property) {
			for (let p of mentor.vocabulary.getSubProperties(this.context.graphs, node.uri, node.options)) {
				result.push(new PropertyNode(this.context, node.id + `/<${p}>`, p, node.options));
			}

			result = this.sortByLabel(result);
		} else if (node.type === OWL.NamedIndividual) {
			for (let p of mentor.vocabulary.getIndividuals(this.context.graphs, node.uri, node.options)) {
				result.push(new IndividualNode(this.context, node.id + `/<${p}>`, p, node.options));
			}

			result = this.sortByLabel(result);
		} else if (node.type === SKOS.ConceptScheme || node.type === SKOS.Concept) {
			for (let c of mentor.vocabulary.getNarrowerConcepts(this.context.graphs, node.uri)) {
				result.push(new ConceptNode(this.context, node.id + `/<${c}>`, c, node.options));
			}

			result = this.sortByLabel(result);
		}

		return result;
	}

	getTreeItem(node: DefinitionTreeNode): vscode.TreeItem {
		if (node && node.id) {
			return {
				id: node.id,
				collapsibleState: node.getCollapsibleState(),
				iconPath: node.getIcon(),
				label: node.getLabel(),
				description: node.getDescription(),
				command: node.getCommand(),
				tooltip: node.getTooltip()
			};
		} else {
			const item = new vscode.TreeItem('No items found', vscode.TreeItemCollapsibleState.None);
			item.contextValue = 'noItems';
			return item;
		}
	}

	/**
	 * Sort the URIs by their labels according to the current label display settings.
	 * @param nodes A list of URIs.
	 * @returns The URIs sorted by their labels.
	 */
	protected sortByLabel(nodes: DefinitionTreeNode[]): DefinitionTreeNode[] {
		return nodes
			.map(n => ({
				node: n,
				label: n.getLabel().label
			}))
			.sort((a, b) => a.label.localeCompare(b.label))
			.map(x => x.node);
	}
}