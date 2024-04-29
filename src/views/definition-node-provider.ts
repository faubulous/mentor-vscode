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
import { ResourceNode } from './nodes/resource-node';

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

	showReferencedClasses = true;

	showPropertyTypes = true;

	showIndividualTypes = true;

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
		if (!node) {
			return this.getRootNodes();
		} else if (node.contextType === OWL.Ontology) {
			return this.getOntologyNodeChildren(node);
		} else if (node.contextType === RDFS.Class) {
			return this.getClassNodeChildren(node);
		} else if (node.contextType === RDF.Property) {
			return this.getPropertyNodeChildren(node);
		} else if (node.contextType === OWL.NamedIndividual) {
			return this.getIndividualNodeChildren(node);
		} else if (node.contextType === SKOS.ConceptScheme || node.contextType === SKOS.Concept) {
			return this.getConceptNodeChildren(node);
		} else {
			return [];
		}
	}

	getRootNodes(): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const ontologyUris = mentor.vocabulary.getOntologies(this.context.graphs);
		const ontologyNodes = [];

		for (let ontology of ontologyUris) {
			const n = new OntologyNode(this.context, `<${ontology}>`, ontology, { definedBy: ontology });
			n.initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

			ontologyNodes.push(n);
		}

		const schemeUris = mentor.vocabulary.getConceptSchemes(this.context.graphs);
		const schemeNodes = [];

		for (let scheme of schemeUris) {
			schemeNodes.push(new ConceptSchemeNode(this.context, `<${scheme}>`, scheme));
		}

		const ontologies = new Set(ontologyUris);
		const sourceUris = mentor.vocabulary.getDefinitionSources(this.context.graphs);
		const sourceNodes = [];

		for (let source of sourceUris) {
			// Handle the case where rdfs:isDefinedBy refers to the ontology namespace
			// but the ontology header is annotated with an absolute URI.
			if (ontologies.has(source) || ontologies.has(Uri.getNormalizedUri(source))) {
				continue;
			}

			const n = new OntologyNode(this.context, `<${source}>`, source, { definedBy: source });
			n.isReferenced = true;

			sourceNodes.push(n);
		}

		const result = [
			...this.sortByLabel(ontologyNodes),
			...this.sortByLabel(schemeNodes),
			...this.sortByLabel(sourceNodes)
		];

		// Note: For the root nodes we only want to show sources that actually contain *defined* classses. 
		// This is why we exclude referenced classes here, independently of the current setting.
		let hasUnknown = false;

		for (let _ of mentor.vocabulary.getClasses(this.context.graphs, { notDefinedBy: ontologyUris, includeReferenced: false })) {
			hasUnknown = true;
			break;
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getProperties(this.context.graphs, { notDefinedBy: ontologyUris, includeReferenced: false })) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getIndividuals(this.context.graphs, undefined, { notDefinedBy: ontologyUris, includeReferenced: false })) {
				hasUnknown = true;
				break;
			}
		}

		if (hasUnknown) {
			const n = new OntologyNode(this.context, '<>', undefined, { notDefinedBy: ontologyUris, includeReferenced: false });
			n.isReferenced = true;

			result.push(n);
		}

		return result;
	}

	getOntologyNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const options = { ...node.options, includeReferenced: this.showReferencedClasses && node.uri != null };

		const result = [];

		const classes = new ClassNode(this.context, node.id + '/classes', undefined, options, "classes");

		if (classes.getCollapsibleState() !== vscode.TreeItemCollapsibleState.None) {
			result.push(classes);
		}

		const properties = new PropertyNode(this.context, node.id + '/properties', undefined, options, "properties");

		if (properties.getCollapsibleState() !== vscode.TreeItemCollapsibleState.None) {
			result.push(properties);
		}

		const individuals = new IndividualNode(this.context, node.id + '/individuals', undefined, options, "individuals");

		if (individuals.getCollapsibleState() !== vscode.TreeItemCollapsibleState.None) {
			result.push(individuals);
		}

		return result;
	}

	getClassNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];
		const classes = mentor.vocabulary.getSubClasses(this.context.graphs, node.uri, node.options);

		for (let c of classes) {
			result.push(new ClassNode(this.context, node.id + `/<${c}>`, c, node.options));
		}

		return this.sortByLabel(result);
	}

	getPropertyNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (node.contextValue === "properties" && this.showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.context.graphs, node.options);

			for (let t of types) {
				const n = new ClassNode(this.context, node.id + `/<${t}>`, t, node.options);
				n.contextType = RDF.Property;
				n.initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

				result.push(n);
			}
		} else if (node.contextValue === "class") {
			const properties = mentor.vocabulary.getPropertiesOfType(this.context.graphs, node.uri!, { ...node.options, includeInferred: false });

			for (let p of properties) {
				result.push(new PropertyNode(this.context, node.id + `/<${p}>`, p, node.options));
			}
		} else {
			const properties = mentor.vocabulary.getSubProperties(this.context.graphs, node.uri, node.options);

			for (let p of properties) {
				result.push(new PropertyNode(this.context, node.id + `/<${p}>`, p, node.options));
			}
		}

		return this.sortByLabel(result);
	}

	getIndividualNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (node.contextValue === "individuals" && this.showIndividualTypes) {
			const types = mentor.vocabulary.getIndividualTypes(this.context.graphs, undefined, node.options);

			for (let t of types) {
				const n = new ClassNode(this.context, node.id + `/<${t}>`, t, node.options);
				n.contextType = OWL.NamedIndividual;
				n.initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

				result.push(n);
			}
		} else {
			const individuals = mentor.vocabulary.getIndividuals(this.context.graphs, node.uri, node.options);

			for (let x of individuals) {
				result.push(new IndividualNode(this.context, node.id + `/<${x}>`, x, node.options));
			}
		}

		return this.sortByLabel(result);
	}

	getConceptNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		for (let c of mentor.vocabulary.getNarrowerConcepts(this.context.graphs, node.uri)) {
			result.push(new ConceptNode(this.context, node.id + `/<${c}>`, c, node.options));
		}

		return this.sortByLabel(result);
	}

	getTreeItem(node: DefinitionTreeNode): vscode.TreeItem {
		if (node && node.id) {
			return {
				id: node.id,
				contextValue: node.contextValue,
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