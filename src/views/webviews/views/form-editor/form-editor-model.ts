/**
 * Data transfer objects shared by the form editor host and webview. These types cross the
 * `postMessage` boundary as plain JSON, so they must not reference RDF/JS terms or any
 * VS Code type. This file is bundled into the webview and must stay free of imports from
 * 'vscode'.
 */

import type { ValueKindHint } from '@src/utilities/value-kind-hint';

/**
 * A term in wire form.
 */
export type TermRef =
	| { kind: 'iri'; iri: string }
	| { kind: 'bnode'; id: string }
	| { kind: 'literal'; value: string; datatype?: string; language?: string };

/**
 * Identifier of a resource within one document revision. Blank node identifiers are assigned
 * by the parser in token order, so they are only valid for the revision they were built from.
 */
export type ResourceId = string;

/**
 * A position in the document, used to reveal a term in the text editor.
 */
export interface DocumentPosition {
	line: number;
	character: number;
}

/**
 * A term together with everything the webview needs to render it without a round trip.
 */
export interface TermView {
	term: TermRef;
	/** Resolved human readable label, for IRIs and blank nodes. */
	label?: string;
	/** Language of the label, used to mark values shown from a fallback language. */
	labelLanguage?: string;
	/** Prefixed form when a prefix is declared for the term's namespace. */
	prefixedName?: string;
	/** The glyph that marks what kind of resource an IRI object denotes. */
	iconName?: string;
	/** Set when the object is a blank node that has its own form. */
	nested?: NestedResourceRef;
	/** Set when the object is an RDF collection, whose items replace it. */
	collection?: CollectionView;
	/** Where the term starts in the document, when a source position is known. */
	position?: DocumentPosition;
	/**
	 * The source offset of the term's token, which pins the value to exactly the statement the
	 * row was rendered from, even among duplicates.
	 */
	anchor?: number;
	/** Whether the term can be edited. Constructs such as RDF 1.2 annotations are read-only. */
	editable: boolean;
}

/**
 * Reference from an object position to the blank node resource it denotes.
 */
export interface NestedResourceRef {
	id: ResourceId;
	propertyCount: number;
	/** The label of the node, resolved as the definition tree resolves it. */
	label?: string;
	/** The label of the type it asserts, when it asserts one. */
	typeLabel?: string;
	/** The glyph that marks what kind of node this is. */
	iconName: string;
}

/**
 * An RDF collection, written `( a b c )`. Its items have a defined order, unlike the several
 * values a predicate may simply carry.
 */
export interface CollectionView {
	items: TermView[];
}

/**
 * A predicate and its object list, in document order.
 */
export interface PropertyView {
	predicate: TermView;
	values: TermView[];
	/** What kind of values the predicate takes, when the host could tell. */
	valueKind?: ValueKindHint;
}

/**
 * One row of the resource list. Deliberately small: the index for a whole document is held
 * in the webview at once, so it must stay cheap for thousands of resources.
 */
export interface ResourceSummary {
	id: ResourceId;
	term: TermRef;
	label: string;
	labelLanguage?: string;
	/** Human readable description, resolved from the configured description predicates. */
	description?: string;
	prefixedName?: string;
	/** The glyph that marks what kind of resource this is. */
	iconName: string;
	/** The labels of the types the resource asserts, in document order. */
	typeLabels?: string[];
	/** The type the definition is shown and pinned by: the first it asserts, past `owl:NamedIndividual`. */
	typeIri?: string;
	/** The label of {@link typeIri}. */
	typeLabel?: string;
	/**
	 * Set for a term of another vocabulary that the document only declares, with its type and
	 * nothing of its own, as Protégé writes them; the view can hide these.
	 */
	externalDeclaration?: boolean;
	/** How often other statements refer to the resource, across the indexed documents. IRIs only. */
	usageCount?: number;
	propertyCount: number;
	valueCount: number;
	/** Anonymous blank nodes referenced exactly once from an object position. */
	nested: boolean;
	/** The graph the resource is described in, for TriG documents. */
	graph?: string;
	/** Whether the document names the resource with one of the configured label predicates. */
	hasLabel: boolean;
	position?: DocumentPosition;
}

/**
 * The properties of a single resource, loaded on demand.
 */
export interface ResourceDetail {
	id: ResourceId;
	term: TermRef;
	/** Human readable description, resolved from the configured description predicates. */
	description?: string;
	/** The labels of the types the resource asserts, in document order. */
	typeLabels?: string[];
	/** The predicate the label was read from, when the document states one for the resource. */
	labelPredicate?: string;
	/** The predicate the description was read from, when the document states one for the resource. */
	descriptionPredicate?: string;
	properties: PropertyView[];
	position?: DocumentPosition;
}

/**
 * A namespace declaration in the document.
 */
export interface NamespaceInfo {
	prefix: string;
	iri: string;
	/** Number of terms in the document that use this namespace. */
	usageCount: number;
	position?: DocumentPosition;
}

/**
 * The predicates a document names and describes its resources with: of the configured label and
 * description predicates, the ones most of its resources use, resolved as the predicates of the
 * rows are. A resource that has neither gets its label or description written with these.
 */
export interface AnnotationScheme {
	label?: TermView;
	description?: TermView;
}

/**
 * A parse or validation problem that prevents editing.
 */
export interface DocumentProblem {
	message: string;
	line: number;
	character: number;
}

/**
 * Why a document cannot be edited in the form editor. `noWriteBack` marks data that is not backed
 * by a writable text document at all, such as a query result or a remote store.
 */
export interface ReadOnlyReason {
	reason: 'syntaxErrors' | 'template' | 'unsupportedSyntax' | 'noWriteBack';
	message: string;
}

/**
 * Where the webview should put the focus after an edit was applied. The host resolves it against
 * the re-parsed document, because an edit can renumber blank nodes and shift value indices.
 */
export interface FocusHint {
	/** The resource that received the edit, or the resource that was created. */
	resourceId: ResourceId;
	/** The resource holding a newly created nested node, so the webview can expand it. */
	parentId?: ResourceId;
	/** The property row of the edited value, in the order of the resource detail. */
	propertyIndex?: number;
	/** The value within the property row, in the order of the resource detail. */
	valueIndex?: number;
	/** The item within a collection value. */
	itemIndex?: number;
	/** Which cell of the row to focus. A `comment` is the run of comment lines holding the edit. */
	target: 'subject' | 'predicate' | 'value' | 'addProperty';
}

/**
 * Everything the webview needs to render a document except the per-resource properties.
 */
export interface DocumentSnapshot {
	/** Version of the text document this snapshot was built from. */
	version: number;
	uri: string;
	fileName: string;
	syntax: string;
	baseIri?: string;
	namespaces: NamespaceInfo[];
	annotationScheme: AnnotationScheme;
	activeLanguage?: string;
	resources: ResourceSummary[];
	/** The resource describing the document, such as its ontology, which heads the form. */
	documentResourceId?: ResourceId;
	/** Datatypes used in the document, offered when changing a literal's datatype. */
	datatypes: string[];
	readOnly?: ReadOnlyReason;
	problems: DocumentProblem[];
	/** The type most definitions have, which their entries do not repeat. */
	dominantTypeIri?: string;
}
