/**
 * Data transfer objects shared by the form editor host and webview. These types cross the
 * `postMessage` boundary as plain JSON, so they must not reference RDF/JS terms or any
 * VS Code type. This file is bundled into the webview and must stay free of imports from
 * 'vscode'.
 */

import type { ValueKindHint } from '@src/utilities/value-kind';
import type { ResourceId } from '@src/services/editing/resource-id';
import type { TermRef } from '@src/services/editing/term-ref';

export type { ResourceId, TermRef };

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
export interface TermView {
	/**
	 * The term itself.
	 */
	term: TermRef;

	/**
	 * Resolved human readable label, for IRIs and blank nodes.
	 */
	label?: string;

	/**
	 * Language of the label, used to mark values shown from a fallback language.
	 */
	labelLanguage?: string;

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
	nested?: NestedResourceRef;

	/**
	 * Set when the object is an RDF collection, whose items replace it.
	 */
	collection?: CollectionView;

	/**
	 * Where the term starts in the document, when a source position is known.
	 */
	position?: DocumentPosition;

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
	 * The comment lines written above this value, when it does not stand first under its predicate.
	 */
	comments?: string[];
}

/**
 * Reference from an object position to the blank node resource it denotes.
 */
export interface NestedResourceRef {
	/**
	 * The identifier of the nested resource.
	 */
	id: ResourceId;

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

	/**
	 * The glyph that marks what kind of node this is.
	 */
	iconName: string;
}

/**
 * An RDF collection, written `( a b c )`. Its items have a defined order, unlike the several
 * values a predicate may simply carry.
 */
export interface CollectionView {
	/**
	 * The items of the collection, in order.
	 */
	items: TermView[];
}

/**
 * A predicate and its object list, in document order.
 */
export interface PropertyView {
	/**
	 * The predicate of the property.
	 */
	predicate: TermView;

	/**
	 * The values of the predicate, in document order.
	 */
	values: TermView[];

	/**
	 * What kind of values the predicate takes, when the host could tell.
	 */
	valueKind?: ValueKindHint;

	/**
	 * The comment lines written above the property, introducing it.
	 */
	comments?: string[];
}

/**
 * One row of the resource list. Deliberately small: the index for a whole document is held
 * in the webview at once, so it must stay cheap for thousands of resources.
 */
export interface ResourceSummary {
	/**
	 * The identifier of the resource within the snapshot.
	 */
	id: ResourceId;

	/**
	 * The term naming the resource.
	 */
	term: TermRef;

	/**
	 * The human readable label, resolved from the configured label predicates.
	 */
	label: string;

	/**
	 * The language of the label, when it was read from a language tagged literal.
	 */
	labelLanguage?: string;

	/**
	 * Human readable description, resolved from the configured description predicates.
	 */
	description?: string;

	/**
	 * The prefixed name of an IRI resource, when a prefix is declared for its namespace.
	 */
	prefixedName?: string;

	/**
	 * The glyph that marks what kind of resource this is.
	 */
	iconName: string;

	/**
	 * The labels of the types the resource asserts, in document order.
	 */
	typeLabels?: string[];

	/**
	 * The type the definition is shown and pinned by: the first it asserts, past `owl:NamedIndividual`.
	 */
	typeIri?: string;

	/**
	 * The label of {@link typeIri}.
	 */
	typeLabel?: string;

	/**
	 * Set for a term of another vocabulary that the document only declares, with its type and
	 * nothing of its own, as Protégé writes them; the view can hide these.
	 */
	externalDeclaration?: boolean;

	/**
	 * How often other statements refer to the resource, across the indexed documents. IRIs only.
	 */
	usageCount?: number;

	/**
	 * How many properties the resource has.
	 */
	propertyCount: number;

	/**
	 * How many values the resource has across its properties.
	 */
	valueCount: number;

	/**
	 * Anonymous blank nodes referenced exactly once from an object position.
	 */
	nested: boolean;

	/**
	 * The graph the resource is described in, for TriG documents.
	 */
	graph?: string;

	/**
	 * Whether the document names the resource with one of the configured label predicates.
	 */
	hasLabel: boolean;

	/**
	 * The comments written above the resource in the document, which stand over its card: the
	 * lines of each run of comments, the runs being separated by blank lines.
	 */
	comments?: string[][];

	/**
	 * Where the resource starts in the document, when a source position is known.
	 */
	position?: DocumentPosition;
}

/**
 * The properties of a single resource, loaded on demand.
 */
export interface ResourceDetail {
	/**
	 * The identifier of the resource within the snapshot.
	 */
	id: ResourceId;

	/**
	 * The term naming the resource.
	 */
	term: TermRef;

	/**
	 * Human readable description, resolved from the configured description predicates.
	 */
	description?: string;

	/**
	 * The labels of the types the resource asserts, in document order.
	 */
	typeLabels?: string[];

	/**
	 * The predicate the label was read from, when the document states one for the resource.
	 */
	labelPredicate?: string;

	/**
	 * The predicate the description was read from, when the document states one for the resource.
	 */
	descriptionPredicate?: string;

	/**
	 * The properties of the resource, in document order.
	 */
	properties: PropertyView[];

	/**
	 * The comment lines written above the resource, for a node written inside another. A resource
	 * of its own carries them on its summary instead, so they stand where they were written:
	 * outside its card rather than within it.
	 */
	comments?: string[];

	/**
	 * Where the resource starts in the document, when a source position is known.
	 */
	position?: DocumentPosition;
}

/**
 * A namespace declaration in the document.
 */
export interface NamespaceInfo {
	/**
	 * The declared prefix.
	 */
	prefix: string;

	/**
	 * The namespace IRI the prefix stands for.
	 */
	iri: string;

	/**
	 * Number of terms in the document that use this namespace.
	 */
	usageCount: number;

	/**
	 * Where the declaration starts in the document, when a source position is known.
	 */
	position?: DocumentPosition;
}

/**
 * The predicates a document names and describes its resources with: of the configured label and
 * description predicates, the ones most of its resources use, resolved as the predicates of the
 * rows are. A resource that has neither gets its label or description written with these.
 */
export interface AnnotationScheme {
	/**
	 * The predicate most resources are labelled with.
	 */
	label?: TermView;

	/**
	 * The predicate most resources are described with.
	 */
	description?: TermView;
}

/**
 * A parse or validation problem that prevents editing.
 */
export interface DocumentProblem {
	/**
	 * What is wrong.
	 */
	message: string;

	/**
	 * The line of the problem, zero based.
	 */
	line: number;

	/**
	 * The character of the problem within its line, zero based.
	 */
	character: number;
}

/**
 * Why a document cannot be edited in the form editor. `noWriteBack` marks data that is not backed
 * by a writable text document at all, such as a query result or a remote store.
 */
export interface ReadOnlyReason {
	/**
	 * Why the document cannot be edited.
	 */
	reason: 'syntaxErrors' | 'template' | 'unsupportedSyntax' | 'noWriteBack';

	/**
	 * The explanation shown to the user.
	 */
	message: string;
}

/**
 * Everything the webview needs to render a document except the per-resource properties.
 */
export interface DocumentSnapshot {
	/**
	 * Version of the text document this snapshot was built from.
	 */
	version: number;

	/**
	 * The URI of the document.
	 */
	uri: string;

	/**
	 * The file name of the document, shown as its title.
	 */
	fileName: string;

	/**
	 * The syntax of the document.
	 */
	syntax: string;

	/**
	 * The base IRI of the document, when it declares one.
	 */
	baseIri?: string;

	/**
	 * The namespace declarations of the document.
	 */
	namespaces: NamespaceInfo[];

	/**
	 * The predicates the document names and describes its resources with.
	 */
	annotationScheme: AnnotationScheme;

	/**
	 * The language the labels and descriptions are read in.
	 */
	activeLanguage?: string;

	/**
	 * The resources of the document, in document order.
	 */
	resources: ResourceSummary[];

	/**
	 * The resource describing the document, such as its ontology, which heads the form.
	 */
	documentResourceId?: ResourceId;

	/**
	 * Datatypes used in the document, offered when changing a literal's datatype.
	 */
	datatypes: string[];

	/**
	 * The comments written after the last statement of the document, which close it, as the
	 * lines of each run.
	 */
	trailingComments?: string[][];

	/**
	 * Why the document cannot be edited, when it cannot.
	 */
	readOnly?: ReadOnlyReason;

	/**
	 * The parse problems of the document.
	 */
	problems: DocumentProblem[];

	/**
	 * The type most definitions have, which their entries do not repeat.
	 */
	dominantTypeIri?: string;
}
