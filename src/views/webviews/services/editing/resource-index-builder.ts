import { QuadContext, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Term } from '@rdfjs/types';
import { RDF, Uri } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getResourceId, toTermRef } from '@src/services/editing/resource-id';
import { getTokenPosition, hasSourcePosition, isTokenOfType } from '@src/utilities/tokens';
import { DocumentPosition, NamespaceInfo, ResourceId } from '@src/views/webviews/views/form-editor/form-editor-model';
import { CollectionItem, ResourceIndex, ResourceIndexEntry } from './resource-index';
import { ResourceViewBuilder } from './resource-view-builder';

/**
 * Builds the resource index of a document from its quad contexts. The quad contexts are used
 * rather than the triple store because a file editor must show the statements in document order,
 * must keep duplicate statements distinguishable, and needs source positions. The store
 * additionally contains inferred triples, which have no representation in the text.
 */
export class ResourceIndexBuilder {
	private readonly _entries = new Map<ResourceId, ResourceIndexEntry>();

	private readonly _order: ResourceId[] = [];

	private readonly _referenceCounts = new Map<ResourceId, number>();

	private readonly _labelledSubjects = new Set<ResourceId>();

	private readonly _datatypes = new Set<string>();

	private readonly _namespaceUsage = new Map<string, number>();

	/**
	 * Create a builder for the statements of a document.
	 * @param _quadContexts The quad contexts of the document.
	 * @param _context The document context, used to resolve labels and prefixes.
	 */
	constructor(private readonly _quadContexts: readonly QuadContext[], private readonly _context: IDocumentContext) { }

	/**
	 * Build the index.
	 * @returns The resource index.
	 */
	build(): ResourceIndex {
		for (const quad of this._quadContexts) {
			this._collect(quad);
		}

		for (const entry of this._entries.values()) {
			entry.nested = entry.term.kind === 'bnode'
				&& !this._labelledSubjects.has(entry.id)
				&& this._referenceCounts.get(entry.id) === 1;
		}

		const index: ResourceIndex = {
			summaries: [],
			entries: this._entries,
			namespaces: this._buildNamespaces(),
			datatypes: Array.from(this._datatypes).sort(),
			referenceCounts: this._referenceCounts,
			...this._buildCollections()
		};
		const views = new ResourceViewBuilder(index, this._context);

		index.summaries = this._order
			.map(id => this._entries.get(id)!)
			.filter(entry => !entry.nested && !index.collectionNodes.has(entry.id))
			.map(entry => views.buildSummary(entry));

		return index;
	}

	/**
	 * Record a statement with the resource it is about.
	 * @param quad The statement.
	 */
	private _collect(quad: QuadContext): void {
		const entry = this._entryOf(quad);

		entry.quads.push(quad);

		// A blank node written as `_:label` is a statement subject in its own right and stays top
		// level. One written as `[ ... ]` in object position has no subject token of its own.
		if (quad.subject.termType === 'BlankNode' && isTokenOfType(quad.subjectToken, RdfToken.BLANK_NODE_LABEL.name)) {
			this._labelledSubjects.add(entry.id);
		}

		if (quad.object.termType === 'BlankNode') {
			const objectId = getResourceId(quad.object);

			this._referenceCounts.set(objectId, (this._referenceCounts.get(objectId) ?? 0) + 1);
		}

		if (quad.object.termType === 'Literal') {
			const datatype = (quad.object as { datatype?: { value: string } }).datatype?.value;

			if (datatype) {
				this._datatypes.add(datatype);
			}
		}

		this._countNamespaceUsage(quad.subject);
		this._countNamespaceUsage(quad.predicate);
		this._countNamespaceUsage(quad.object);
	}

	/**
	 * Find the entry of the subject of a statement, starting it at its first statement.
	 * @param quad The statement.
	 * @returns The entry.
	 */
	private _entryOf(quad: QuadContext): ResourceIndexEntry {
		const id = getResourceId(quad.subject);
		const existing = this._entries.get(id);

		if (existing) {
			return existing;
		}

		const entry: ResourceIndexEntry = {
			id,
			term: toTermRef(quad.subject),
			quads: [],
			nested: false,
			graph: quad.graph?.value || undefined,
			position: _toPosition(quad.subjectToken)
		};

		this._entries.set(id, entry);
		this._order.push(id);

		return entry;
	}

	/**
	 * Count a use of the namespace of a term.
	 * @param term The term.
	 */
	private _countNamespaceUsage(term: Term): void {
		if (term.termType !== 'NamedNode') {
			return;
		}

		const namespaceIri = Uri.getNamespaceIri(term.value);

		this._namespaceUsage.set(namespaceIri, (this._namespaceUsage.get(namespaceIri) ?? 0) + 1);
	}

	/**
	 * Build the namespace list of the document, ordered by prefix.
	 * @returns The namespaces.
	 */
	private _buildNamespaces(): NamespaceInfo[] {
		return Object.entries(this._context.namespaces)
			.map(([prefix, iri]) => ({
				prefix,
				iri,
				usageCount: this._namespaceUsage.get(iri) ?? 0,
				position: this._toNamespacePosition(prefix, iri)
			}))
			.sort((a, b) => a.prefix.localeCompare(b.prefix));
	}

	/**
	 * Resolve the position of a namespace declaration. The Turtle document keys its declarations
	 * by namespace IRI, while the XML parser keys them by prefix, so both keys are tried.
	 * @param prefix The declared prefix.
	 * @param iri The namespace IRI.
	 * @returns The position, or `undefined` when the declaration is not located.
	 */
	private _toNamespacePosition(prefix: string, iri: string): DocumentPosition | undefined {
		const range = this._context.namespaceDefinitions.first(iri) ?? this._context.namespaceDefinitions.first(prefix);

		return range ? { line: range.start.line, character: range.start.character } : undefined;
	}

	/**
	 * Collapse the `rdf:first` and `rdf:rest` chains of the document into ordered item lists. A
	 * collection is written `( a b c )` but stored as a chain of blank nodes. Those nodes are
	 * structure rather than content: showing them as resources, or their chaining statements as
	 * properties, would describe how the list is encoded instead of what it holds.
	 * @returns The items of each collection by its head, and every node belonging to a chain.
	 */
	private _buildCollections(): Pick<ResourceIndex, 'collections' | 'collectionNodes'> {
		const collections = new Map<ResourceId, CollectionItem[]>();
		const collectionNodes = new Set<ResourceId>();
		const restTargets = new Set<ResourceId>();

		for (const entry of this._entries.values()) {
			for (const quad of entry.quads) {
				if (quad.predicate.value === RDF.rest && quad.object.termType === 'BlankNode') {
					restTargets.add(getResourceId(quad.object));
				}
			}
		}

		for (const entry of this._entries.values()) {
			if (!entry.quads.some(quad => quad.predicate.value === RDF.first)) {
				continue;
			}

			collectionNodes.add(entry.id);

			// Only a node no other node points its `rdf:rest` at begins a collection.
			if (!restTargets.has(entry.id)) {
				collections.set(entry.id, this._walkCollection(entry));
			}
		}

		return { collections, collectionNodes };
	}

	/**
	 * Follow a collection chain from its head and collect the items in order.
	 * @param head The entry heading the collection.
	 * @returns The items of the collection.
	 */
	private _walkCollection(head: ResourceIndexEntry): CollectionItem[] {
		const items: CollectionItem[] = [];
		const visited = new Set<ResourceId>();
		let current: ResourceIndexEntry | undefined = head;

		// A malformed chain can loop; the guard bounds the walk rather than hanging the editor.
		while (current && !visited.has(current.id)) {
			visited.add(current.id);

			const first = current.quads.find(quad => quad.predicate.value === RDF.first);

			if (first) {
				items.push({ term: first.object, quad: first });
			}

			const next: Term | undefined = current.quads.find(quad => quad.predicate.value === RDF.rest)?.object;

			current = next?.termType === 'BlankNode' ? this._entries.get(getResourceId(next)) : undefined;
		}

		return items;
	}
}


/**
 * Convert the source token of a quad component to a document position.
 * @param token The token.
 * @returns The position, or `undefined` if the token has no source location.
 */
function _toPosition(token: QuadContext['subjectToken']): DocumentPosition | undefined {
	if (!hasSourcePosition(token)) {
		return undefined;
	}

	const { start } = getTokenPosition(token);

	return { line: start.line, character: start.character };
}
