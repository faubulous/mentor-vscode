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
import { CollectionNode } from './nodes/collection-node';
import { DefinitionTreeLayout } from '../settings';

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

	showDefinitionSources = false;

	constructor() {
		if (mentor.activeContext) {
			this._onDidChangeVocabulary(mentor.activeContext);
		}

		mentor.onDidChangeVocabularyContext((context) => {
			this._onDidChangeVocabulary(context);
		});

		mentor.settings.onDidChange("view.treeLabelStyle", () => {
			this.refresh();
		});

		// Initialize the default tree layout from the user preferences.
		let layout = mentor.configuration.get<DefinitionTreeLayout>('view.definitionTreeLayout');

		this._onDidChangeTreeLayout(layout);

		mentor.settings.onDidChange("view.definitionTreeLayout", (e) => {
			// When the layout was changed through a command, refresh the tree.
			this._onDidChangeTreeLayout(e.newValue);

			this.refresh();
		});
	}

	private _onDidChangeTreeLayout(layout?: DefinitionTreeLayout): void {
		switch (layout) {
			case DefinitionTreeLayout.ByType:
				this.showDefinitionSources = false;
				break;
			default:
				this.showDefinitionSources = true;
				break;
		}
	}

	private _onDidChangeVocabulary(e: DocumentContext | undefined): void {
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
		this._onDidChangeVocabulary(this.context);
	}

	getParent(node: DefinitionTreeNode): DefinitionTreeNode | null | undefined {
		throw new Error('Method not implemented.');
	}

	getChildren(node: DefinitionTreeNode): DefinitionTreeNode[] | null | undefined {
		if (!node) {
			if (this.showDefinitionSources) {
				return this.getRootNodesWithSources();
			} else {
				return this.getRootNodes();
			}
		} else if (node.contextType === OWL.Ontology) {
			return this.getOntologyNodeChildren(node);
		} else if (node.contextType === RDFS.Class) {
			return this.getClassNodeChildren(node);
		} else if (node.contextType === RDF.Property) {
			return this.getPropertyNodeChildren(node);
		} else if (node.contextType === OWL.NamedIndividual) {
			return this.getIndividualNodeChildren(node);
		} else if (node.contextType === SKOS.ConceptScheme) {
			return this.getConceptSchemeNodeChildren(node);
		} else if (node.contextType === SKOS.Concept) {
			return this.getConceptNodeChildren(node);
		} if (node.contextType == SKOS.Collection) {
			return this.getCollectionNodeChildren(node);
		} else {
			return [];
		}
	}

	/**
	 * Get the root nodes of the document, grouped by type.
	 * @returns The root nodes of the document.
	 */
	getRootNodes(): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		let result = [];

		const ontologyUris = mentor.vocabulary.getOntologies(this.context.graphs);

		for (let ontology of ontologyUris) {
			const n = new OntologyNode(this.context, `<${ontology}>`, ontology);
			n.initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

			result.push(n);
		}

		const schemeUris = mentor.vocabulary.getConceptSchemes(this.context.graphs);

		for (let scheme of schemeUris) {
			result.push(new ConceptSchemeNode(this.context, `<${scheme}>`, scheme));
		}

		for (let _ of mentor.vocabulary.getClasses(this.context.graphs)) {
			result.push(new ClassNode(this.context, '<>/classes', undefined, { includeReferenced: this.showReferencedClasses }, "classes"));
			break;
		}

		for (let _ of mentor.vocabulary.getProperties(this.context.graphs)) {
			result.push(new PropertyNode(this.context, '<>/properties', undefined, undefined, "properties"));
			break;
		}

		for (let _ of mentor.vocabulary.getIndividuals(this.context.graphs, undefined)) {
			result.push(new IndividualNode(this.context, '<>/individuals', undefined, undefined, "individuals"));
			break;
		}

		return result;
	}

	/**
	 * Get the root nodes of the document, grouped by definition source.
	 * @returns The root nodes of the document.
	 */
	getRootNodesWithSources(): DefinitionTreeNode[] {
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
			n.initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
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
			const n = new OntologyNode(this.context, '<>', undefined, { notDefinedBy: [...ontologyUris, ...sourceUris], includeReferenced: false });
			n.isReferenced = true;

			result.push(n);
		}

		return result;
	}

	/**
	 * Get the children of an ontology node.
	 * @param node An ontology node.
	 * @returns An array of children.
	 */
	getOntologyNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		// Note: Do not override the node options includeReferenced setting if it is already set.
		const includeReferenced = node.options?.includeReferenced === undefined && this.showReferencedClasses && node.uri != null;

		const options = { ...node.options, includeReferenced: includeReferenced };

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

	/**
	 * Get the children of a class node.
	 * @param node A class node.
	 * @returns An array of children.
	 */
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

	/**
	 * Get the children of a property node.
	 * @param node A property node.
	 * @returns An array of children.
	 */
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
			// Note: We only want to returen the asserted properties here.
			let options = { ...node.options, includeInferred: false };
			let properties = mentor.vocabulary.getPropertiesOfType(this.context.graphs, node.uri!, options);

			if (properties.length == 0) {
				// As a fallback, we also include inferred properties.
				options.includeInferred = true;
				properties = mentor.vocabulary.getProperties(this.context.graphs, options);
			}

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

	/**
	 * Get the children of an invidiual node.
	 * @param node A invidiual node.
	 * @returns An array of children.
	 */
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

	/**
	 * Get the children of a concept node.
	 * @param node A concept node.
	 * @returns An array of children.
	 */
	getConceptNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		let subject = node.uri;

		if (!subject && node.options?.definedBy) {
			subject = node.options.definedBy;
		}

		const result = [];

		for (let c of mentor.vocabulary.getNarrowerConcepts(this.context.graphs, subject)) {
			result.push(new ConceptNode(this.context, node.id + `/<${c}>`, c, node.options));
		}

		return this.sortByLabel(result);
	}

	/**
	 * Get the children of a concept scheme node.
	 * @param node A concept scheme node.
	 * @returns An array of children.
	 */
	getConceptSchemeNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];
		const options = { ...node.options, definedBy: node.uri };

		const concepts = new ConceptNode(this.context, node.id + '/concepts', undefined, options);

		if (concepts.getCollapsibleState() !== vscode.TreeItemCollapsibleState.None) {
			result.push(concepts);
		}

		const collections = new CollectionNode(this.context, node.id + '/collections', undefined, options);

		if (collections.getCollapsibleState() !== vscode.TreeItemCollapsibleState.None) {
			result.push(collections);
		}

		return result;
	}

	/**
	 * Get the children of a collection node.
	 * @param node A collection node.
	 * @returns An array of children.
	 */
	getCollectionNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (!node.uri) {
			const collections = mentor.vocabulary.getCollections(this.context.graphs);

			for (let c of collections) {
				result.push(new CollectionNode(this.context, node.id + `/<${c}>`, c, node.options));
			}
		} else if (mentor.vocabulary.isOrderedCollection(this.context.graphs, node.uri)) {
			const members = mentor.vocabulary.getCollectionMembers(this.context.graphs, node.uri);

			for (let m of members) {
				result.push(new ConceptNode(this.context, node.id + `/<${m}>`, m, node.options));
			}

			return result;
		} else {
			const members = mentor.vocabulary.getCollectionMembers(this.context.graphs, node.uri);

			for (let m of members) {
				result.push(new ConceptNode(this.context, node.id + `/<${m}>`, m, node.options));
			}
		}

		return this.sortByLabel(result);
	}

	getTreeItem(node: DefinitionTreeNode): vscode.TreeItem {
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