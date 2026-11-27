/**
 * The data of the resource cards: what a card shows of a resource, its statements and the terms in
 * them. The form editor exchanges it with its webview, and the tooltips of the definition tree and
 * the text editor show the compact card from it. It is plain data and must not reference any VS
 * Code type; the form editor webview bundles it.
 */

import type { BlankNode, Literal, NamedNode } from '@rdfjs/types';
import type { ScopeKey } from '@src/utilities/config-scope';
import type { PredicateRangeData } from '@src/services/vocabulary/predicate-range';

/**
 * A position in the document, used to reveal a term in the text editor.
 */
export interface DocumentPosition {
	/**
	 * The line, zero based.
	 */
	line: number;

	/**
	 * The character within the line, zero based.
	 */
	character: number;
}

/**
 * A term together with everything the webview needs to render it without a round trip.
 */
export interface TermData {
	/**
	 * The term itself.
	 */
	term: NamedNode | BlankNode | Literal;

	/**
	 * Resolved human readable label, for IRIs and blank nodes.
	 */
	label?: string;

	/**
	 * Prefixed form when a prefix is declared for the term's namespace.
	 */
	prefixedName?: string;

	/**
	 * The glyph that marks what kind of resource an IRI object denotes.
	 */
	iconName?: string;

	/**
	 * Set when the object is a blank node that has its own form.
	 */
	nested?: NestedResourceData;

	/**
	 * Set when the object is an RDF collection, whose items replace it.
	 */
	collection?: CollectionData;

	/**
	 * The source offset of the term's token, which pins the value to exactly the statement the
	 * row was rendered from, even among duplicates.
	 */
	anchor?: number;

	/**
	 * Whether the term can be edited. Constructs such as RDF 1.2 annotations are read-only.
	 */
	editable: boolean;

	/**
	 * Set for a value the reasoner infers, which no document writes and which therefore only reads.
	 */
	inferred?: boolean;

	/**
	 * The comment lines written above this value, when it does not stand first under its predicate.
	 */
	comments?: string[];
}

/**
 * Reference from an object position to the blank node resource it denotes.
 */
export interface NestedResourceData {
	/**
	 * The blank node naming the nested resource.
	 */
	term: BlankNode;

	/**
	 * How many properties the nested resource has.
	 */
	propertyCount: number;

	/**
	 * The label of the node, resolved as the definition tree resolves it.
	 */
	label?: string;

	/**
	 * The label of the type it asserts, when it asserts one.
	 */
	typeLabel?: string;
}

/**
 * An RDF collection, written `( a b c )`. Its items have a defined order, unlike the several
 * values a predicate may simply carry.
 */
interface CollectionData {
	/**
	 * The items of the collection, in order.
	 */
	items: TermData[];
}

/**
 * A predicate and its object list, in document order.
 */
export interface PredicateData {
	/**
	 * The predicate of the property.
	 */
	predicate: TermData;

	/**
	 * The values of the predicate, in document order.
	 */
	values: TermData[];

	/**
	 * What values the predicate takes for the resource, where the store tells it.
	 */
	range?: PredicateRangeData;

	/**
	 * The comment lines written above the property, introducing it.
	 */
	comments?: string[];
}

/**
 * The data of a resource as a value shows it, as a pill, an option of the resource picker or an
 * entry of the class list: the resource, its label and its kind. Every resource of the snapshot
 * and every header the host sends along carries it.
 */
export interface ResourcePillData {
	/**
	 * The term naming the resource. A blank node keeps its identifier across versions of the
	 * document, as the parser names an anonymous node by where it is written.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The human readable label, resolved from the configured label predicates.
	 */
	label: string;

	/**
	 * Whether the document names the resource with one of the configured label predicates.
	 */
	hasLabel: boolean;

	/**
	 * The prefixed name of an IRI resource, when a prefix is declared for its namespace.
	 */
	prefixedName?: string;

	/**
	 * The glyph that marks what kind of resource this is.
	 */
	iconName: string;
}

/**
 * The data a card shows above its statements: the title with the types, the description or the
 * pinned properties, the usage count, the actions of the title bar and the IRI in the footer. The
 * compact card of a tooltip shows nothing else. The host sends it along with the statements of a
 * resource the snapshot does not list, such as a blank node written inside another resource or a
 * resource read from the store.
 */
export interface ResourceCardHeaderData extends ResourcePillData {
	/**
	 * The type the definition is shown and pinned by: the first it asserts, past `owl:NamedIndividual`.
	 */
	typeIri?: string;

	/**
	 * The label of {@link typeIri}.
	 */
	typeLabel?: string;

	/**
	 * The labels of every type the resource asserts, in the order asserted, where they resolve.
	 */
	typeLabels?: string[];

	/**
	 * The labels of the types the reasoner infers for the resource besides those it asserts.
	 */
	inferredTypeLabels?: string[];

	/**
	 * Human readable description, resolved from the configured description predicates.
	 */
	description?: string;

	/**
	 * The properties pinned for the types of the resource, asserted or inferred, which its
	 * collapsed card shows: empty when none is pinned, and absent for a resource of no known type,
	 * whose properties cannot be pinned since pins are stored per type.
	 */
	pins?: PinnedProperty[];

	/**
	 * How often other statements refer to the resource, across the indexed documents. IRIs only.
	 */
	usageCount?: number;

	/**
	 * Where the resource is first written in the document, which a text editor reveals.
	 */
	position?: DocumentPosition;

	/**
	 * The local part of the IRI of the resource, which renaming it changes as F2 does: what follows
	 * the prefix of its prefixed name, else what follows the namespace of the IRI, up to its last
	 * `#` or `/`. Absent for a blank node and an IRI without a local part.
	 */
	localPart?: string;
}

/**
 * The data of one entry of the resource list, which the snapshot holds for every resource of the
 * document: its card header, the comments that stand above its card and what the list filters by.
 * Deliberately small, as the list of a whole document is held in the webview at once and must stay
 * cheap for thousands of resources.
 */
export interface ResourceListItemData extends ResourceCardHeaderData {
	/**
	 * The comments written above the resource in the document, which stand over its card: the
	 * lines of each run of comments, the runs being separated by blank lines.
	 */
	comments?: string[][];

	/**
	 * Set for a term of another vocabulary that the document only declares, with its type and
	 * nothing of its own, as Protégé writes them; the view can hide these.
	 */
	externalDeclaration?: boolean;

	/**
	 * How many properties the resource has.
	 */
	propertyCount: number;
}

/**
 * A property pinned on the cards of a resource.
 */
export interface PinnedProperty {
	/**
	 * The predicate.
	 */
	predicate: NamedNode;

	/**
	 * The settings it is pinned in: the user settings pin it for oneself, the workspace settings
	 * for everyone.
	 */
	scope: ScopeKey;
}

/**
 * The data of the body of a card: the statements about one resource, grouped by predicate, which
 * its rows show. It is fetched as a card needs it, while the list items of all resources come
 * with the snapshot.
 */
export interface ResourceCardBodyData {
	/**
	 * The resource the statements are about: the subject of each of them.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The statements grouped by predicate, in document order.
	 */
	predicates: PredicateData[];

	/**
	 * The comment lines written above the resource, for a node written inside another. A resource
	 * of its own carries them on its list item instead, so they stand where they were written:
	 * outside its card rather than within it.
	 */
	leadingComments?: string[];

	/**
	 * The comment lines written after the last statement of the resource, before the `.` or `]`
	 * that closes its statements, which end its card.
	 */
	endComments?: string[];
}

/**
 * A namespace declaration in the document.
 */
export interface NamespaceData {
	/**
	 * The declared prefix.
	 */
	prefix: string;

	/**
	 * The namespace IRI the prefix stands for.
	 */
	iri: string;
}

/**
 * The data of a card of a resource read from the store, which no document defines: its header,
 * with the usage count and the pins, and the statements of its body.
 */
export interface ResourceCardData {
	/**
	 * The header of the card.
	 */
	cardHeader: ResourceCardHeaderData;

	/**
	 * The statements of the card.
	 */
	cardBody: ResourceCardBodyData;
}
