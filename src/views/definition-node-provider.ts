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

	/**
	 * Indicates whether to show referenced classes or properties in the tree view.
	 */
	showReferences = true;

	private _onDidChangeTreeData: vscode.EventEmitter<DefinitionTreeNode | undefined> = new vscode.EventEmitter<DefinitionTreeNode | undefined>();

	readonly onDidChangeTreeData: vscode.Event<DefinitionTreeNode | undefined> = this._onDidChangeTreeData.event;

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

		mentor.settings.onDidChange("view.definitionTree.defaultLayout", (e) => {
			this.refresh();
		});
	}

	private _onDidChangeVocabulary(e: DocumentContext | undefined): void {
		if (e) {
			this.document = e;
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
		this._onDidChangeVocabulary(this.document);
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
			const n = new OntologyNode(this.document, `<${ontologyUri}>`, ontologyUri);
			n.initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

			result.push(n);
		}

		const schemeUris = mentor.vocabulary.getConceptSchemes(this.document.graphs);

		for (const schemeUri of schemeUris) {
			result.push(new ConceptSchemeNode(this.document, `<${schemeUri}>`, schemeUri));
		}

		for (let _ of mentor.vocabulary.getClasses(this.document.graphs)) {
			const n = new ClassGroupNode(this.document, '<>/classes', undefined, { includeReferenced: this.showReferences });

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getProperties(this.document.graphs)) {
			const n = new PropertyGroupNode(this.document, '<>/properties', undefined, { includeReferenced: this.showReferences });

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getIndividuals(this.document.graphs, undefined)) {
			const n = new IndividualGroupNode(this.document, '<>/individuals', undefined);

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getShapes(this.document.graphs, undefined)) {
			const n = new ShapeGroupNode(this.document, '<>/shapes', undefined);

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getRules(this.document.graphs, undefined)) {
			const n = new RuleGroupNode(this.document, '<>/rules', undefined);

			result.push(n);
			break;
		}

		for (let _ of mentor.vocabulary.getValidators(this.document.graphs, undefined)) {
			const n = new ValidatorGroupNode(this.document, '<>/validators', undefined);

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
		if (!this.document) {
			return [];
		}

		const ontologyUris = mentor.vocabulary.getOntologies(this.document.graphs);
		const ontologyNodes = [];

		for (const ontologyUri of ontologyUris) {
			const n = new OntologyNode(this.document, `<${ontologyUri}>`, ontologyUri, { definedBy: ontologyUri });
			n.initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

			ontologyNodes.push(n);
		}

		const schemeUris = mentor.vocabulary.getConceptSchemes(this.document.graphs);
		const schemeNodes = [];

		for (const schemeUri of schemeUris) {
			schemeNodes.push(new ConceptSchemeNode(this.document, `<${schemeUri}>`, schemeUri));
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

			const n = new OntologyNode(this.document, `<${source}>`, source, { definedBy: source });
			n.initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			n.isReferenced = true;

			sourceNodes.push(n);
		}

		const result = [
			...sortByLabel(ontologyNodes),
			...sortByLabel(schemeNodes),
			...sortByLabel(sourceNodes)
		];

		// Note: For the root nodes we only want to show sources that actually contain *defined* classses. 
		// This is why we exclude referenced classes here, independently of the current setting.
		let options = { notDefinedBy: new Set([...ontologyUris, ...sourceUris]), includeReferenced: false };
		let hasUnknown = false;

		for (let _ of mentor.vocabulary.getClasses(this.document.graphs, options)) {
			hasUnknown = true;
			break;
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getProperties(this.document.graphs, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getIndividuals(this.document.graphs, undefined, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getShapes(this.document.graphs, undefined, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getRules(this.document.graphs, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (!hasUnknown) {
			for (let _ of mentor.vocabulary.getValidators(this.document.graphs, options)) {
				hasUnknown = true;
				break;
			}
		}

		if (hasUnknown) {
			// Important: Reset the includeReferenced setting for the root nodes.
			const n = new OntologyNode(this.document, '<>', undefined, {
				...options,
				includeReferenced: this.showReferences
			});
			n.isReferenced = true;

			result.push(n);
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

		if (this.hasShapes(node)) {
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
		if (this.document && node.uri) {
			return mentor.vocabulary.hasShapes(this.document.graphs, node.uri, { ...node.options, definedBy: undefined });
		} else {
			return false;
		}
	}
}