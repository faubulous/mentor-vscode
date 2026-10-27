import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { RDF } from '@faubulous/mentor-rdf';
import { Term } from '@rdfjs/types';
import { DocumentPosition, NamespaceInfo, ResourceId, ResourceSummary, TermRef } from '@src/views/webviews/views/form-editor/form-editor-model';

/**
 * A resource collected from the document, together with the statements that describe it.
 */
export interface ResourceIndexEntry {
	/**
	 * The identifier of the resource within the index.
	 */
	id: ResourceId;

	/**
	 * The term naming the resource.
	 */
	term: TermRef;

	/**
	 * The statements about the resource, in document order.
	 */
	quads: QuadContext[];

	/**
	 * Whether the resource is an anonymous blank node written inline as an object.
	 */
	nested: boolean;

	/**
	 * The graph the resource is described in, for TriG documents.
	 */
	graph?: string;

	/**
	 * Where the resource starts in the document, when a source position is known.
	 */
	position?: DocumentPosition;
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
 * The resources of a document, in the order they appear in the source.
 */
export interface ResourceIndex {
	/**
	 * The rows shown in the resource list, excluding blank nodes rendered inside their parent.
	 */
	summaries: ResourceSummary[];

	/**
	 * The resources by identifier.
	 */
	entries: Map<ResourceId, ResourceIndexEntry>;

	/**
	 * The namespace declarations of the document, ordered by prefix.
	 */
	namespaces: NamespaceInfo[];

	/**
	 * The datatypes used in the document, sorted.
	 */
	datatypes: string[];

	/**
	 * The items of each collection, by the identifier of the node that heads it.
	 */
	collections: Map<ResourceId, CollectionItem[]>;

	/**
	 * Every node that is part of a collection chain, none of which is shown on its own.
	 */
	collectionNodes: Set<ResourceId>;

	/**
	 * How often each resource stands as the object of a statement of the document.
	 */
	referenceCounts: Map<ResourceId, number>;
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
 * Indicate whether a predicate chains the nodes of a collection, which describes how a list is
 * encoded rather than what it holds.
 * @param predicateIri The IRI of the predicate.
 * @returns `true` for `rdf:first` and `rdf:rest`.
 */
export function isCollectionChainPredicate(predicateIri: string): boolean {
	return predicateIri === RDF.first || predicateIri === RDF.rest;
}
