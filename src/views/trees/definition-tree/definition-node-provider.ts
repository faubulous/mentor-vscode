import * as vscode from 'vscode';
import { RDF, Uri, VocabularyRepository, _RDFS, _SH } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService, IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { any } from '@src/utilities';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';
import { DefinitionTreeNode } from './definition-tree-node';
import { ClassesNode } from './nodes/classes-node';
import { ConceptSchemeNode } from './nodes/concept-scheme-node';
import { IndividualsNode } from './nodes/individuals-node';
import { OntologyNode } from './nodes/ontology-node';
import { PropertiesNode } from './nodes/properties-node';
import { RulesNode } from './nodes/rules-node';
import { ShapesNode } from './nodes/shapes-node';
import { ValidatorsNode } from './nodes/validators-node';
import { TreeNode, sortByLabel } from '../tree-node';

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class DefinitionNodeProvider implements vscode.TreeDataProvider<DefinitionTreeNode> {
	/**
	 * The vocabulary document context.
	 */
	public document: IDocumentContext | undefined;

	/**
	 * Cache of tree nodes keyed by their resource IRI, populated as the tree expands.
	 */
	private _nodeCache = new Map<string, DefinitionTreeNode>();

	private _onDidChangeTreeData: vscode.EventEmitter<DefinitionTreeNode | undefined> = new vscode.EventEmitter<DefinitionTreeNode | undefined>();

	readonly onDidChangeTreeData: vscode.Event<DefinitionTreeNode | undefined> = this._onDidChangeTreeData.event;

	private get vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	private get settings() {
		return container.resolve<ISettingsService>(ServiceToken.SettingsService);
	}

	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get workspaceIndexerService() {
		return container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
	}

	constructor() {
		this.contextService.onDidChangeDocumentContext((context) => {
			// Update the tree when the active document changed.
			this.refresh(context);
		});

		this.workspaceIndexerService.onDidFinishIndexing(() => {
			// Update the tree when the workspace has been indexed, incorporating definitions from external files.
			this.refresh();
		});

		this.settings.onDidChange("view.definitionTree.labelStyle", () => this.refresh());
		this.settings.onDidChange("view.definitionTree.defaultLayout", () => this.refresh());
		this.settings.onDidChange("view.showReferences", () => this.refresh());
		this.settings.onDidChange("view.showPropertyTypes", () => this.refresh());
		this.settings.onDidChange("view.showIndividualTypes", () => this.refresh());
		this.settings.onDidChange("view.activeLanguage", () => this.refresh());
	}

	/**
	 * Refresh the tree view.
	 */
	refresh(document?: IDocumentContext): void {
		if (document) {
			this.document = document;
		}

		if (this.document) {
			this._nodeCache.clear();
			this._onDidChangeTreeData.fire(undefined);
		}
	}

	getParent(node: DefinitionTreeNode): DefinitionTreeNode | undefined {
		return node.parent;
	}

	getChildren(node: DefinitionTreeNode): DefinitionTreeNode[] | null | undefined {
		let children: DefinitionTreeNode[];

		if (!node) {
			const layout = this.settings.get<DefinitionTreeLayout>('view.definitionTree.defaultLayout');

			children = layout === DefinitionTreeLayout.ByType
				? this.getRootNodes()
				: this.getRootNodesWithSources() as DefinitionTreeNode[];
		} else {
			children = node.getChildren() as DefinitionTreeNode[];
		}

		// Cache nodes with real resource IRIs so they can be revealed later.
		for (const child of children) {
			if (child.uri && !child.uri.startsWith('mentor:')) {
				this._nodeCache.set(child.uri, child);
			}
		}

		return children;
	}

	/**
	 * Find the tree node for a given resource IRI. Falls back to a two-level
	 * traversal of the tree so the node can be revealed even before the user has
	 * manually expanded it.
	 * @param iri The resource IRI to search for.
	 * @returns The matching tree node, or undefined if not found.
	 */
	getNodeForUri(iri: string): DefinitionTreeNode | undefined {
		if (this._nodeCache.has(iri)) {
			return this._nodeCache.get(iri);
		}

		const classNode = this._getClassNodeFromPath(iri);

		if (classNode) {
			this._nodeCache.set(iri, classNode);
			return classNode;
		}

		const propertyNode = this._getPropertyNodeFromPath(iri);

		if (propertyNode) {
			this._nodeCache.set(iri, propertyNode);
			return propertyNode;
		}

		// Traverse the tree breadth-first so deeply nested nodes (e.g. subclasses)
		// can also be found and revealed.
		const queue = [...(this.getChildren(undefined as unknown as DefinitionTreeNode) ?? [])];
		const visited = new Set<string>();
		const maxNodes = 5000;
		let inspected = 0;

		while (queue.length > 0 && inspected < maxNodes) {
			const node = queue.shift()!;

			if (visited.has(node.id)) {
				continue;
			}

			visited.add(node.id);
			inspected++;

			if (node.uri === iri) {
				this._nodeCache.set(iri, node);
				return node;
			}

			const children = this.getChildren(node) ?? [];

			for (const child of children) {
				if (!visited.has(child.id)) {
					queue.push(child);
				}
			}
		}

		return this._nodeCache.get(iri);
	}

	/**
	 * Resolve a class node by following the class hierarchy path from root to leaf.
	 * This is more efficient and deterministic than a full tree traversal for class IRIs.
	 */
	private _getClassNodeFromPath(iri: string): DefinitionTreeNode | undefined {
		if (!this.document) {
			return undefined;
		}

		const includeReferenced = this.settings.get('view.showReferences', true);

		if (!this.vocabulary.hasType(this.document.graphs, iri, _RDFS.Class)) {
			return undefined;
		}

		const rootToTargetPath = [
			...this.vocabulary.getRootClassPath(this.document.graphs, iri, { includeReferenced })
		].reverse();
		rootToTargetPath.push(iri);

		const roots = this.getChildren(undefined as unknown as DefinitionTreeNode) ?? [];
		const classContainers: DefinitionTreeNode[] = [];

		for (const root of roots) {
			if (root.uri === 'mentor:classes') {
				classContainers.push(root);
			}

			for (const child of this.getChildren(root) ?? []) {
				if (child.uri === 'mentor:classes') {
					classContainers.push(child);
				}
			}
		}

		for (const container of classContainers) {
			let children = this.getChildren(container) ?? [];
			let found: DefinitionTreeNode | undefined;

			for (const pathIri of rootToTargetPath) {
				found = children.find((n) => n.uri === pathIri);

				if (!found) {
					break;
				}

				children = this.getChildren(found) ?? [];
			}

			if (found?.uri === iri) {
				return found;
			}
		}

		return undefined;
	}

	/**
	 * Resolve a property node by following the property hierarchy path from root to leaf.
	 * This avoids a full-tree traversal for property IRIs.
	 */
	private _getPropertyNodeFromPath(iri: string): DefinitionTreeNode | undefined {
		if (!this.document) {
			return undefined;
		}

		const includeReferenced = this.settings.get('view.showReferences', true);

		if (!this.vocabulary.hasType(this.document.graphs, iri, RDF.Property)) {
			return undefined;
		}

		const rootToTargetPath = [
			...this.vocabulary.getRootPropertiesPath(this.document.graphs, iri, { includeReferenced })
		].reverse();
		rootToTargetPath.push(iri);

		const roots = this.getChildren(undefined as unknown as DefinitionTreeNode) ?? [];
		const propertyContainers: DefinitionTreeNode[] = [];

		for (const root of roots) {
			if (root.uri === 'mentor:properties') {
				propertyContainers.push(root);
			}

			for (const child of this.getChildren(root) ?? []) {
				if (child.uri === 'mentor:properties') {
					propertyContainers.push(child);
				}
			}
		}

		for (const container of propertyContainers) {
			let startNodes = this.getChildren(container) ?? [];

			// If properties are grouped by type, each child is a property type node.
			// Try every type branch and follow the property path inside that branch.
			if (this.settings.get('view.showPropertyTypes', true)) {
				for (const typeNode of startNodes) {
					let children = this.getChildren(typeNode) ?? [];
					let found: DefinitionTreeNode | undefined;

					for (const pathIri of rootToTargetPath) {
						found = children.find((n) => n.uri === pathIri);

						if (!found) {
							break;
						}

						children = this.getChildren(found) ?? [];
					}

					if (found?.uri === iri) {
						return found;
					}
				}
			} else {
				let children = startNodes;
				let found: DefinitionTreeNode | undefined;

				for (const pathIri of rootToTargetPath) {
					found = children.find((n) => n.uri === pathIri);

					if (!found) {
						break;
					}

					children = this.getChildren(found) ?? [];
				}

				if (found?.uri === iri) {
					return found;
				}
			}
		}

		return undefined;
	}

	protected createRootNode<NodeType extends DefinitionTreeNode>(
		NodeConstructor: new (document: IDocumentContext, id: string, iri: string, options?: any) => NodeType,
		document: IDocumentContext,
		iri: string,
		options?: any
	): NodeType {
		const id = `<${iri}>`;

		return new NodeConstructor(document, id, iri, options);
	}

	/**
	 * Get the root nodes of the document, grouped by type.
	 * @returns The root nodes of the document.
	 */
	getRootNodes() {
		if (!this.document) {
			return [];
		}

		const result: DefinitionTreeNode[] = [];

		const ontologyUris = this.vocabulary.getOntologies(this.document.graphs);

		for (const ontologyUri of ontologyUris) {
			const node = this.createRootNode(OntologyNode, this.document, ontologyUri, { definedBy: ontologyUri });

			// Note: Group by defintion source is disabled here, so we do not make the ontology nodes exapndable.
			node.initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

			result.push(node);
		}

		const schemeUris = this.vocabulary.getConceptSchemes(this.document.graphs);

		for (const schemeUri of schemeUris) {
			result.push(this.createRootNode(ConceptSchemeNode, this.document, schemeUri));
		}

		if (any(this.vocabulary.getClasses(this.document.graphs))) {
			result.push(this.createRootNode(ClassesNode, this.document, 'mentor:classes'));
		}

		if (any(this.vocabulary.getProperties(this.document.graphs))) {
			result.push(this.createRootNode(PropertiesNode, this.document, 'mentor:properties'));
		}

		if (any(this.vocabulary.getIndividuals(this.document.graphs, undefined))) {
			result.push(this.createRootNode(IndividualsNode, this.document, 'mentor:individuals'));
		}

		if (any(this.vocabulary.getShapes(this.document.graphs, undefined))) {
			result.push(this.createRootNode(ShapesNode, this.document, 'mentor:shapes'));
		}

		if (any(this.vocabulary.getRules(this.document.graphs, undefined))) {
			result.push(this.createRootNode(RulesNode, this.document, 'mentor:rules'));
		}

		if (any(this.vocabulary.getValidators(this.document.graphs, undefined))) {
			result.push(this.createRootNode(ValidatorsNode, this.document, 'mentor:validators'));
		}

		return result;
	}

	/**
	 * Get the root nodes of the document, grouped by definition source.
	 * @returns The root nodes of the document.
	 */
	getRootNodesWithSources(): TreeNode[] {
		if (!this.document) {
			return [];
		}

		const ontologyUris = [...this.vocabulary.getOntologies(this.document.graphs)];
		const ontologyNodes = [];

		for (const ontologyUri of ontologyUris) {
			const node = this.createRootNode(OntologyNode, this.document, ontologyUri, { definedBy: ontologyUri });
			node.initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

			ontologyNodes.push(node);
		}

		const schemeUris = this.vocabulary.getConceptSchemes(this.document.graphs);
		const schemeNodes = [];

		for (const schemeUri of schemeUris) {
			schemeNodes.push(this.createRootNode(ConceptSchemeNode, this.document, schemeUri));
		}

		const ontologies = new Set(ontologyUris);
		const sourceUris = this.vocabulary.getDefinitionSources(this.document.graphs);
		const sourceNodes = [];

		for (let source of sourceUris) {
			// Handle the case where rdfs:isDefinedBy refers to the ontology namespace
			// but the ontology header is annotated with an absolute URI.
			if (ontologies.has(source) || ontologies.has(Uri.getNormalizedUri(source))) {
				continue;
			}

			const node = this.createRootNode(OntologyNode, this.document, source, { definedBy: source });
			node.initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			node.isReferenced = true;

			sourceNodes.push(node);
		}

		const result = [
			...sortByLabel(ontologyNodes),
			...sortByLabel(schemeNodes),
			...sortByLabel(sourceNodes)
		];

		// Note: For the root nodes we only want to show sources that actually contain *defined* classses. 
		// This is why we exclude referenced classes here, independent from the current setting.
		let options = { notDefinedBy: new Set([...ontologyUris, ...sourceUris]), includeReferenced: false };
		let hasUnknown: boolean =
			any(this.vocabulary.getClasses(this.document.graphs, options)) ||
			any(this.vocabulary.getProperties(this.document.graphs, options)) ||
			any(this.vocabulary.getIndividuals(this.document.graphs, undefined, options)) ||
			any(this.vocabulary.getShapes(this.document.graphs, undefined, options)) ||
			any(this.vocabulary.getRules(this.document.graphs, options)) ||
			any(this.vocabulary.getValidators(this.document.graphs, options));

		if (hasUnknown) {
			// Important: Reset the includeReferenced setting for the root nodes.
			const node = this.createRootNode(OntologyNode, this.document, 'mentor:unknown', { notDefinedBy: options.notDefinedBy });
			node.isReferenced = true;

			result.push(node);
		}

		// If there is only one definition source, expand it by default.
		if (result.length === 1) {
			result[0].initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}

		return result;
	}

	getTreeItem(node: DefinitionTreeNode): vscode.TreeItem {
		return {
			id: node.id,
			collapsibleState: node.getCollapsibleState(),
			contextValue: node.getContextValue(),
			resourceUri: node.getResourceUri(),
			iconPath: node.getIcon(),
			label: node.getLabel(),
			description: node.getDescription(),
			command: node.getCommand(),
			tooltip: node.getTooltip()
		};
	}
}