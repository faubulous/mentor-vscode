import { QuadContext, RdfToken, toQuadContext } from '@faubulous/mentor-rdf-parsers';
import { BlankNode, NamedNode, Quad, Term } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { RDF, Store } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { createSyntheticToken, isTokenOfType } from '@src/utilities/tokens';
import { NamespaceData } from '@src/views/webviews/views/form-editor/form-editor-model';
import { CollectionItem, ResourceIndex, ResourceIndexEntry } from './resource-index';
import { ResourceViewBuilder } from './resource-view-builder';
import { trailingCommentRunsOf } from './statement-comments';

/**
 * How deep the blank nodes a resource of the store refers to are followed, which bounds what is
 * read for it, as the form bounds how deep it nests their cards.
 */
const MAX_STORE_NESTING_DEPTH = 3;

/**
 * Builds the resource index of a document from its quad contexts. The quad contexts are used
 * rather than the triple store because a file editor must show the statements in document order,
 * must keep duplicate statements distinguishable, and needs source positions. The store
 * additionally contains inferred triples, which have no representation in the text.
 */
export class ResourceIndexBuilder {
	private readonly _entries = new Map<string, ResourceIndexEntry>();

	private readonly _order: string[] = [];

	private readonly _referenceCounts = new Map<string, number>();

	private readonly _holders = new Map<string, NamedNode | BlankNode>();

	private readonly _labelledSubjects = new Set<string>();

	/**
	 * Create a builder for the statements of a document.
	 * @param _quadContexts The quad contexts of the document.
	 * @param _context The document context, used to resolve labels and prefixes.
	 */
	constructor(private readonly _quadContexts: readonly QuadContext[], private readonly _context: IDocumentContext) { }

	/**
	 * Build the index of what the store states about a resource the document does not define, as
	 * a document would state it: its statements from every graph that is not inferred, and those of
	 * the blank nodes it refers to, read from the graph that refers to them. The statements carry
	 * synthetic tokens, so their values cannot be edited and have no position in a text.
	 * @param store The store.
	 * @param iri The IRI of the resource.
	 * @param context The document context, used to resolve labels and prefixes.
	 * @returns The index, or `undefined` when the store states nothing about the resource.
	 */
	static fromStore(store: Store, iri: string, context: IDocumentContext): ResourceIndex | undefined {
		const quads = _storeQuadsOf(store, RdfDataFactory.namedNode(iri));

		return quads.length > 0 ? new ResourceIndexBuilder(quads, context).build() : undefined;
	}

	/**
	 * Build the index.
	 * @returns The resource index.
	 */
	build(): ResourceIndex {
		for (const quad of this._quadContexts) {
			this._collect(quad);
		}

		for (const [key, entry] of this._entries) {
			entry.nested = entry.term.termType === 'BlankNode'
				&& !this._labelledSubjects.has(key)
				&& this._referenceCounts.get(key) === 1;
		}

		const index: ResourceIndex = {
			listItems: [],
			entries: this._entries,
			namespaces: this._buildNamespaces(),
			referenceCounts: this._referenceCounts,
			holders: this._holders,
			trailingComments: trailingCommentRunsOf(this._quadContexts),
			...this._buildCollections()
		};
		const views = new ResourceViewBuilder(index, this._context);

		index.listItems = this._order
			.filter(key => !this._entries.get(key)!.nested && !index.collectionNodes.has(key))
			.map(key => views.buildListItem(this._entries.get(key)!));

		return index;
	}

	/**
	 * Record a statement with the resource it is about.
	 * @param quad The statement.
	 */
	private _collect(quad: QuadContext): void {
		const key = termToString(quad.subject);
		const entry = this._entryOf(key, quad.subject as NamedNode | BlankNode);

		entry.quads.push(quad);

		// A blank node written as `_:label` is a statement subject in its own right and stays top
		// level. One written as `[ ... ]` in object position has no subject token of its own.
		if (quad.subject.termType === 'BlankNode' && isTokenOfType(quad.subjectToken, RdfToken.BLANK_NODE_LABEL.name)) {
			this._labelledSubjects.add(key);
		}

		if (quad.object.termType === 'BlankNode') {
			const objectKey = termToString(quad.object);

			this._referenceCounts.set(objectKey, (this._referenceCounts.get(objectKey) ?? 0) + 1);

			if (!this._holders.has(objectKey)) {
				this._holders.set(objectKey, entry.term);
			}
		}
	}

	/**
	 * Find the entry of the subject of a statement, starting it at its first statement.
	 * @param key The key of the subject.
	 * @param subject The subject.
	 * @returns The entry.
	 */
	private _entryOf(key: string, subject: NamedNode | BlankNode): ResourceIndexEntry {
		const existing = this._entries.get(key);

		if (existing) {
			return existing;
		}

		const entry: ResourceIndexEntry = { term: subject, quads: [], nested: false };

		this._entries.set(key, entry);
		this._order.push(key);

		return entry;
	}


	/**
	 * Build the namespace list of the document, ordered by prefix.
	 * @returns The namespaces.
	 */
	private _buildNamespaces(): NamespaceData[] {
		return Object.entries(this._context.namespaces)
			.map(([prefix, iri]) => ({ prefix, iri }))
			.sort((a, b) => a.prefix.localeCompare(b.prefix));
	}


	/**
	 * Collapse the `rdf:first` and `rdf:rest` chains of the document into ordered item lists. A
	 * collection is written `( a b c )` but stored as a chain of blank nodes. Those nodes are
	 * structure rather than content: showing them as resources, or their chaining statements as
	 * properties, would describe how the list is encoded instead of what it holds.
	 * @returns The items of each collection by its head, and every node belonging to a chain.
	 */
	private _buildCollections(): Pick<ResourceIndex, 'collections' | 'collectionNodes'> {
		const collections = new Map<string, CollectionItem[]>();
		const collectionNodes = new Set<string>();
		const restTargets = new Set<string>();

		for (const entry of this._entries.values()) {
			for (const quad of entry.quads) {
				if (quad.predicate.value === RDF.rest && quad.object.termType === 'BlankNode') {
					restTargets.add(termToString(quad.object));
				}
			}
		}

		for (const [key, entry] of this._entries) {
			if (!entry.quads.some(quad => quad.predicate.value === RDF.first)) {
				continue;
			}

			collectionNodes.add(key);

			// Only a node no other node points its `rdf:rest` at begins a collection.
			if (!restTargets.has(key)) {
				collections.set(key, this._walkCollection(entry));
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
		const visited = new Set<ResourceIndexEntry>();
		let current: ResourceIndexEntry | undefined = head;

		// A malformed chain can loop; the guard bounds the walk rather than hanging the editor.
		while (current && !visited.has(current)) {
			visited.add(current);

			const first = current.quads.find(quad => quad.predicate.value === RDF.first);

			if (first) {
				items.push({ term: first.object, quad: first });
			}

			const next: Term | undefined = current.quads.find(quad => quad.predicate.value === RDF.rest)?.object;

			current = next?.termType === 'BlankNode' ? this._entries.get(termToString(next)) : undefined;
		}

		return items;
	}
}

/**
 * Read the statements of the store about a resource and about the blank nodes it refers to, each
 * statement once however many graphs state it, as quad contexts with synthetic tokens.
 * @param store The store.
 * @param subject The resource.
 * @returns The statements, those of each blank node after the statement that refers to it.
 */
function _storeQuadsOf(store: Store, subject: NamedNode): QuadContext[] {
	const quads: QuadContext[] = [];
	const seen = new Set<string>();

	const visit = (node: NamedNode | BlankNode, graph: string | undefined, depth: number): void => {
		for (const quad of store.matchAll(graph, node, null, null, false)) {
			const key = _statementKeyOf(quad);

			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			quads.push(toQuadContext(quad.subject, createSyntheticToken(), quad.predicate, createSyntheticToken(), quad.object, createSyntheticToken()));

			if (quad.object.termType === 'BlankNode' && depth < MAX_STORE_NESTING_DEPTH) {
				visit(quad.object, quad.graph.termType === 'NamedNode' ? quad.graph.value : undefined, depth + 1);
			}
		}
	};

	visit(subject, undefined, 0);

	return quads;
}

/**
 * The key of a statement regardless of its graph.
 * @param quad The statement.
 * @returns The key.
 */
function _statementKeyOf(quad: Quad): string {
	return `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)}`;
}
