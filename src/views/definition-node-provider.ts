import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { Uri, OWL, RDF, RDFS, SKOS, SH, _SH } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';
import { DefinitionTreeNode } from './definition-tree-node';
import { ClassNode } from './nodes/class-node';
import { CollectionNode } from './nodes/collection-node';
import { ConceptNode } from './nodes/concept-node';
import { ConceptSchemeNode } from './nodes/concept-scheme-node';
import { IndividualNode } from './nodes/individual-node';
import { OntologyNode } from './nodes/ontology-node';
import { PropertyNode } from './nodes/property-node';
import { DefinitionTreeLayout } from '../settings';
import { ShapeNode } from './nodes/shape-node';
import { ValidatorNode } from './nodes/validator-node';
import { RuleNode } from './nodes/rule-node';

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

	/**
	 * Indicates whether to show referenced classes or properties in the tree view.
	 */
	showReferences = true;

	/**
	 * Indicates whether to show property types in the tree view.
	 */
	showPropertyTypes = true;

	/**
	 * Indicates whether to show individual types in the tree view.
	 */
	showIndividualTypes = true;

	/**
	 * Indicates whether to group the definitions by type or by source (ontology / concept scheme).
	 */
	showDefinitionSources = false;

	constructor() {
		if (mentor.activeContext) {
			this._onDidChangeVocabulary(mentor.activeContext);
		}

		mentor.onDidChangeVocabularyContext((context) => {
			this._onDidChangeVocabulary(context);
		});

		mentor.settings.onDidChange("view.definitionTree.labelStyle", () => {
			this.refresh();
		});

		// Initialize the default tree layout from the user preferences.
		let layout = mentor.configuration.get<DefinitionTreeLayout>('view.definitionTree.defaultLayout');

		this._onDidChangeTreeLayout(layout);

		mentor.settings.onDidChange("view.definitionTree.defaultLayout", (e) => {
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
		// TODO: Refactor into separate node provider classes and associate these with the nodes.
		if (!node) {
			return this.showDefinitionSources ? this.getRootNodesWithSources() : this.getRootNodes();
		} else if (node.contextType === OWL.Ontology) {
			return this.getOntologyNodeChildren(node);
		} else if (node.contextType === RDFS.Class) {
			return this.getClassNodeChildren(node);
		} else if (node.contextType === RDF.Property) {
			return this.getPropertyNodeChildren(node);
		} else if (node.contextType === OWL.NamedIndividual) {
			return this.getIndividualNodeChildren(node);
		} else if (node.contextType === SH.Shape) {
			return this.getShapeNodeChildren(node);
		} else if (node.contextType === SH.Validator) {
			return this.getValidatorNodeChildren(node);
		} else if (node.contextType === SH.Rule) {
			return this.getRuleNodeChildren(node);
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
			const n = new ClassNode(this.context, '<>/classes', undefined, { includeReferenced: this.showReferences });
			n.contextValue = "classes";

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getProperties(this.context.graphs)) {
			const n = new PropertyNode(this.context, '<>/properties', undefined, { includeReferenced: this.showReferences });
			n.contextValue = "properties";

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getIndividuals(this.context.graphs, undefined)) {
			const n = new IndividualNode(this.context, '<>/individuals', undefined, undefined);
			n.contextValue = "individuals";

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getShapes(this.context.graphs, undefined)) {
			const n = new ShapeNode(this.context, '<>/shapes', undefined, undefined);
			n.contextValue = "shapes";

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getRules(this.context.graphs, undefined)) {
			const n = new RuleNode(this.context, '<>/rules', undefined, undefined);
			n.contextValue = "rules";

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getValidators(this.context.graphs, undefined)) {
			const n = new ValidatorNode(this.context, '<>/validators', undefined, undefined);
			n.contextValue = "validators";

			result.push(n);
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
		let options = { notDefinedBy: new Set([...ontologyUris, ...sourceUris]), includeReferenced: false };
		let hasUnknown = false;

		for (let _ of mentor.vocabulary.getClasses(this.context.graphs, options)) {
			hasUnknown = true;
			break;
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getProperties(this.context.graphs, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getIndividuals(this.context.graphs, undefined, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getShapes(this.context.graphs, undefined, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getRules(this.context.graphs, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getValidators(this.context.graphs, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (hasUnknown) {
			const n = new OntologyNode(this.context, '<>', undefined, options);
			n.isReferenced = true;

			result.push(n);
		}

		// If there is only one definition source, expand it by default.
		if (result.length === 1) {
			result[0].initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;
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

		const result = [];

		// Note: Do not override the node options includeReferenced setting if it is already set.
		const includeReferenced = node.options?.includeReferenced === undefined && this.showReferences && node.uri != null;
		const options = { ...node.options, includeReferenced: includeReferenced };

		const classes = new ClassNode(this.context, node.id + '/classes', undefined, options);
		classes.contextValue = "classes";

		if (this.getClassNodeChildren(classes).length > 0) {
			result.push(classes);
		}

		const properties = new PropertyNode(this.context, node.id + '/properties', undefined, options);
		properties.contextValue = "properties";

		if (this.getPropertyNodeChildren(properties).length > 0) {
			result.push(properties);
		}

		const individuals = new IndividualNode(this.context, node.id + '/individuals', undefined, options);
		individuals.contextValue = "individuals";

		if (this.getIndividualNodeChildren(individuals).length > 0) {
			result.push(individuals);
		}

		const shapes = new ShapeNode(this.context, node.id + '/shapes', undefined, { ...options, includeBlankNodes: true });
		shapes.contextValue = "shapes";

		if (this.getShapeNodeChildren(shapes).length > 0) {
			result.push(shapes);
		}

		const rules = new RuleNode(this.context, node.id + '/rules', undefined, { ...options, includeBlankNodes: true });
		rules.contextValue = "rules";

		if (this.getRuleNodeChildren(rules).length > 0) {
			result.push(rules);
		}

		const validators = new ValidatorNode(this.context, node.id + '/validators', undefined, { ...options, includeBlankNodes: true });
		validators.contextValue = "validators";

		if (this.getValidatorNodeChildren(validators).length > 0) {
			result.push(validators);
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
	 * @returns An array of child nodes.
	 */
	getPropertyNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (node.contextValue === "properties" && this.showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.context.graphs, node.options);

			for (let type of types) {
				const n = new ClassNode(this.context, node.id + `/<${type}>`, type, node.options);
				n.contextType = RDF.Property;

				result.push(n);
			}
		} else if (node instanceof ClassNode) {
			// Note: We only want to return the asserted properties here.
			let properties = mentor.vocabulary.getRootPropertiesOfType(this.context.graphs, node.uri!, node.options);

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
	 * @returns An array of child nodes.
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

	getNodeChildrenOfType(graphUris: string | string[] | undefined, node: DefinitionTreeNode, typeUri: string, createNode: (subjectUri: string) => DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const type = node.uri ? node.uri : typeUri;

		// Include the sub classes of the given type *before* the nodes of the given type.
		const classNodes = [];
		const classes = mentor.vocabulary.getSubClasses(graphUris, type);

		for (let c of classes) {
			if (mentor.vocabulary.hasSubjectsOfType(graphUris, c, node.options)) {
				const n = new ClassNode(this.context, node.id + `/<${c}>`, c, node.options);
				n.contextType = typeUri;

				classNodes.push(n);
			}
		}

		// Include the nodes of the given type *after* the sub classes.
		const subjectNodes = [];

		const subjectUris = mentor.vocabulary.getSubjectsOfType(graphUris, type, {
			...node.options,
			includeSubTypes: false
		});

		for (let s of subjectUris) {
			subjectNodes.push(createNode(s));
		}

		return [...this.sortByLabel(classNodes), ...this.sortByLabel(subjectNodes)];
	}

	/**
	 * Get the children of a shape node.
	 * @param node A shape node.
	 * @returns An array of child nodes.
	 */
	getShapeNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		} else {
			const context = this.context;
			const options = { ...node.options };
			options.notDefinedBy?.add(_SH);

			return this.getNodeChildrenOfType([_SH, ...context.graphs], node, SH.Shape, (uri) => new ShapeNode(context, node.id + `/<${uri}>`, uri, node.options));
		}
	}

	/**
	 * Get the children of a validator node.
	 * @param node A validator node.
	 * @returns An array of validator nodes.
	 */
	getValidatorNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (this.context != null) {
			const context = this.context;
			const options = { ...node.options };
			options.notDefinedBy?.add(_SH);

			return this.getNodeChildrenOfType([_SH, ...context.graphs], node, SH.Validator, (uri) => new ValidatorNode(context, node.id + `/<${uri}>`, uri, node.options));
		} else {
			return [];
		}
	}

	/**
	 * Get the children of a validator node.
	 * @param node A validator node.
	 * @returns An array of validator nodes.
	 */
	getRuleNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (this.context != null) {
			const context = this.context;
			const options = { ...node.options };
			options.notDefinedBy?.add(_SH);

			return this.getNodeChildrenOfType([_SH, ...context.graphs], node, SH.Rule, (uri) => new RuleNode(context, node.id + `/<${uri}>`, uri, node.options));
		} else {
			return [];
		}
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

		if (this.getConceptNodeChildren(concepts).length > 0) {
			result.push(concepts);
		}

		const collections = new CollectionNode(this.context, node.id + '/collections', undefined, options);

		if (this.getCollectionNodeChildren(collections).length > 0) {
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
		const children = this.getChildren(node);
		const collapsibleState = children?.length ? node.initialCollapsibleState : vscode.TreeItemCollapsibleState.None;

		if (!(node instanceof ShapeNode) && this.hasShapes(node)) {
			node.contextValue += ' shape-target';
		}

		return {
			id: node.id,
			contextValue: node.contextValue,
			collapsibleState: collapsibleState,
			resourceUri: node.getResourceUri(),
			iconPath: node.getIcon(),
			label: node.getLabel(),
			description: node.getDescription(),
			command: node.getCommand(),
			tooltip: node.getTooltip()
		};
	}

	protected hasShapes(node: DefinitionTreeNode): boolean {
		if (this.context && node.uri) {
			return mentor.vocabulary.hasShapes(this.context.graphs, node.uri, { ...node.options, definedBy: undefined });
		} else {
			return false;
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