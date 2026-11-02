import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { RDF } from '@faubulous/mentor-rdf';
import { BlankNode, NamedNode, Term } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { NamespaceInfo, ResourceSummary } from '@src/views/webviews/views/form-editor/form-editor-model';

/**
 * A resource collected from the document, together with the statements that describe it.
 */
export interface ResourceIndexEntry {
	/**
	 * The term naming the resource.
	 */
	term: NamedNode | BlankNode;

	/**
	 * The statements about the resource, in document order.
	 */
	quads: QuadContext[];

	/**
	 * Whether the resource is an anonymous blank node written inline as an object.
	 */
	nested: boolean;
}

/**
 * An item of an RDF collection together with the `rdf:first` statement it was read from, which
 * carries the source token of the item.
 */
export interface CollectionItem {
	/**
	 * The item.
	 */
	term: Term;

	/**
	 * The statement naming the item.
	 */
	quad: QuadContext;
}

/**
 * The resources of a document, in the order they appear in the source. Its maps and sets are keyed
 * by the `termToString` form of a term, the key the store uses. Blank nodes keep their identifiers
 * across versions of the document, as the parser names an anonymous node by where it is written.
 */
export interface ResourceIndex {
	/**
	 * The rows shown in the resource list, excluding blank nodes rendered inside their parent.
	 */
	summaries: ResourceSummary[];

	/**
	 * The resources, by the key of their term.
	 */
	entries: Map<string, ResourceIndexEntry>;

	/**
	 * The namespace declarations of the document, ordered by prefix.
	 */
	namespaces: NamespaceInfo[];

	/**
	 * The items of each collection, by the key of the node that heads it.
	 */
	collections: Map<string, CollectionItem[]>;

	/**
	 * The keys of every node that is part of a collection chain, none of which is shown on its own.
	 */
	collectionNodes: Set<string>;

	/**
	 * How often each blank node stands as the object of a statement of the document, by its key.
	 */
	referenceCounts: Map<string, number>;

	/**
	 * The resource each blank node is first written under as a value, by the key of the node.
	 */
	holders: Map<string, NamedNode | BlankNode>;

	/**
	 * The comments written after the last statement of the document, which close it, as the
	 * lines of each run.
	 */
	trailingComments: string[][];
}

/**
 * Options controlling how the views of the indexed resources are built.
 */
export interface ResourceIndexOptions {
	/**
	 * Resolve the glyph of an IRI that the document does not describe, from what the store knows
	 * about it. Objects described in the document get their glyph from their own statements.
	 */
	resolveObjectIcon?: (iri: string) => string | undefined;
}

/**
 * Get the IRIs of the types a resource asserts, in document order, each once.
 * @param entry The resource.
 * @returns The type IRIs.
 */
export function typeIrisOf(entry: ResourceIndexEntry): string[] {
	const types = entry.quads
		.filter(quad => quad.predicate.value === RDF.type && quad.object.termType === 'NamedNode')
		.map(quad => quad.object.value);

	return [...new Set(types)];
}

/**
 * Get the entry of a resource.
 * @param index The index.
 * @param term The term naming the resource.
 * @returns The entry, or `undefined` when the document says nothing about the resource.
 */
export function getEntry(index: ResourceIndex, term: Term): ResourceIndexEntry | undefined {
	return index.entries.get(termToString(term));
}

/**
 * Find the resource whose card shows a resource: the resource itself when it has a card of its
 * own, else the resource of the card it is written in, as a node written inside another or the
 * node of a collection is.
 * @param index The index.
 * @param term The term naming the resource.
 * @returns The resource with the card, or `undefined` when the document shows no card for it.
 */
export function findCardResource(index: ResourceIndex, term: NamedNode | BlankNode): NamedNode | BlankNode | undefined {
	const visited = new Set<string>();
	let current: NamedNode | BlankNode | undefined = term;

	// A malformed collection chain can loop; the guard bounds the walk.
	while (current && !visited.has(termToString(current))) {
		const key = termToString(current);
		const entry = index.entries.get(key);

		if (entry && !entry.nested && !index.collectionNodes.has(key)) {
			return current;
		}

		visited.add(key);
		current = index.holders.get(key);
	}

	return undefined;
}

/**
 * Indicate whether a predicate chains the nodes of a collection, which describes how a list is
 * encoded rather than what it holds.
 * @param predicateIri The IRI of the predicate.
 * @returns `true` for `rdf:first` and `rdf:rest`.
 */
export function isCollectionChainPredicate(predicateIri: string): boolean {
	return predicateIri === RDF.first || predicateIri === RDF.rest;
}
