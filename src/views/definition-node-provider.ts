import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { Uri, _SH } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';
import { DefinitionTreeLayout } from '../settings';
import { DefinitionTreeNode, sortByLabel } from './definition-tree-node';
import { ClassGroupNode } from './nodes/class-group-node';
import { ConceptSchemeNode } from './nodes/concept-scheme-node';
import { IndividualGroupNode } from './nodes/individual-group-node';
import { OntologyNode } from './nodes/ontology-node';
import { PropertyGroupNode } from './nodes/property-group-node';
import { RuleGroupNode } from './nodes/rule-group-node';
import { ShapeGroupNode } from './nodes/shape-group-node';
import { ValidatorGroupNode } from './nodes/validator-group-node';

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class DefinitionNodeProvider implements vscode.TreeDataProvider<DefinitionTreeNode> {
	/**
	 * The vocabulary document context.
	 */
	public document: DocumentContext | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<DefinitionTreeNode | undefined> = new vscode.EventEmitter<DefinitionTreeNode | undefined>();

	readonly onDidChangeTreeData: vscode.Event<DefinitionTreeNode | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.onDidChangeVocabularyContext((context) => {
			// Update the tree when the active document changed.
			this.refresh(context);
		});

		mentor.workspaceIndexer.onDidFinishIndexing(() => {
			// Update the tree when the workspace has been indexed, incorporating definitions from external files.
			this.refresh();
		});

		mentor.settings.onDidChange("view.definitionTree.labelStyle", () => this.refresh());
		mentor.settings.onDidChange("view.definitionTree.defaultLayout", () => this.refresh());
		mentor.settings.onDidChange("view.showReferences", () => this.refresh());
		mentor.settings.onDidChange("view.showPropertyTypes", () => this.refresh());
		mentor.settings.onDidChange("view.showIndividualTypes", () => this.refresh());
		mentor.settings.onDidChange("view.activeLanguage", () => this.refresh());
	}

	/**
	 * Refresh the tree view.
	 */
	refresh(document?: DocumentContext): void {
		if (document) {
			this.document = document;
		}

		if (this.document) {
			this._onDidChangeTreeData.fire(undefined);
		}
	}

	getParent(node: DefinitionTreeNode): DefinitionTreeNode | null | undefined {
		throw new Error('Method not implemented.');
	}

	getChildren(node: DefinitionTreeNode): DefinitionTreeNode[] | null | undefined {
		if (!node) {
			let layout = mentor.settings.get<DefinitionTreeLayout>('view.definitionTree.defaultLayout');

			if (layout === DefinitionTreeLayout.ByType) {
				return this.getRootNodes();
			} else {
				return this.getRootNodesWithSources();
			}
		} else {
			return node.getChildren();
		}
	}

	protected createRootNode<NodeType extends DefinitionTreeNode>(
		NodeConstructor: new (document: DocumentContext, id: string, iri: string, options?: any) => NodeType,
		document: DocumentContext,
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
	getRootNodes(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		let result = [];

		const ontologyUris = mentor.vocabulary.getOntologies(this.document.graphs);

		for (const ontologyUri of ontologyUris) {
			const node = this.createRootNode(OntologyNode, this.document, ontologyUri, { definedBy: ontologyUri });

			// Note: Group by defintion source is disabled here, so we do not make the ontology nodes exapndable.
			node.initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

			result.push(node);
		}

		const schemeUris = mentor.vocabulary.getConceptSchemes(this.document.graphs);

		for (const schemeUri of schemeUris) {
			result.push(this.createRootNode(ConceptSchemeNode, this.document, schemeUri));
		}

		if (mentor.vocabulary.getClasses(this.document.graphs).length > 0) {
			result.push(this.createRootNode(ClassGroupNode, this.document, 'mentor:classes'));
		}

		if (mentor.vocabulary.getProperties(this.document.graphs).length > 0) {
			result.push(this.createRootNode(PropertyGroupNode, this.document, 'mentor:properties'));
		}

		if (mentor.vocabulary.getIndividuals(this.document.graphs, undefined).length > 0) {
			result.push(this.createRootNode(IndividualGroupNode, this.document, 'mentor:individuals'));
		}

		if (mentor.vocabulary.getShapes(this.document.graphs, undefined).length > 0) {
			result.push(this.createRootNode(ShapeGroupNode, this.document, 'mentor:shapes'));
		}

		if (mentor.vocabulary.getRules(this.document.graphs, undefined).length > 0) {
			result.push(this.createRootNode(RuleGroupNode, this.document, 'mentor:rules'));
		}

		if (mentor.vocabulary.getValidators(this.document.graphs, undefined).length > 0) {
			result.push(this.createRootNode(ValidatorGroupNode, this.document, 'mentor:validators'));
		}

		return result;
	}

	/**
	 * Get the root nodes of the document, grouped by definition source.
	 * @returns The root nodes of the document.
	 */
	getRootNodesWithSources(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const ontologyUris = mentor.vocabulary.getOntologies(this.document.graphs);
		const ontologyNodes = [];

		for (const ontologyUri of ontologyUris) {
			const node = this.createRootNode(OntologyNode, this.document, ontologyUri, { definedBy: ontologyUri });
			node.initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

			ontologyNodes.push(node);
		}

		const schemeUris = mentor.vocabulary.getConceptSchemes(this.document.graphs);
		const schemeNodes = [];

		for (const schemeUri of schemeUris) {
			schemeNodes.push(this.createRootNode(ConceptSchemeNode, this.document, schemeUri));
		}

		const ontologies = new Set(ontologyUris);
		const sourceUris = mentor.vocabulary.getDefinitionSources(this.document.graphs);
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
			mentor.vocabulary.getClasses(this.document.graphs, options).length > 0 ||
			mentor.vocabulary.getProperties(this.document.graphs, options).length > 0 ||
			mentor.vocabulary.getIndividuals(this.document.graphs, undefined, options).length > 0 ||
			mentor.vocabulary.getShapes(this.document.graphs, undefined, options).length > 0 ||
			mentor.vocabulary.getRules(this.document.graphs, options).length > 0 ||
			mentor.vocabulary.getValidators(this.document.graphs, options).length > 0;

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
		const children = this.getChildren(node);
		const collapsibleState = children?.length ? node.initialCollapsibleState : vscode.TreeItemCollapsibleState.None;

		return {
			id: node.id,
			collapsibleState: collapsibleState,
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