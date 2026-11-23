/**
 * Data transfer objects shared by the form editor host and webview. They cross the `postMessage`
 * boundary as plain data: the RDF/JS terms in them arrive without their methods and are revived
 * on arrival with `reviveTerms`. They must not reference any VS Code type. This file is bundled
 * into the webview and must stay free of imports from 'vscode'.
 */

import type { BlankNode, Literal, NamedNode } from '@rdfjs/types';
import type { ScopeKey } from '@src/utilities/config-scope';

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
 * What values a predicate takes for a resource, as the store tells it: by a range or a shape, or
 * only by the type of the property.
 */
export interface PredicateRangeData {
	/**
	 * Whether the predicate takes literals or resources.
	 */
	type: 'literal' | 'resource';

	/**
	 * The IRI of the datatype of its literals, where the range names one.
	 */
	datatype?: string;

	/**
	 * Where it was read from: a range of the predicate, its `schema:rangeIncludes`, or a SHACL shape
	 * of the resource, which decide the type of a new value before its other values do; or only the
	 * type of the property, such as an object property, which decides it after them.
	 */
	source: 'range' | 'propertyType';
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
 * The kind of terms a picker searches for: the predicates of statements, the classes a resource is
 * typed with, the resources a value refers to, or the datatypes of literals.
 */
export type TermSearchKind = 'predicate' | 'class' | 'resource' | 'datatype';

/**
 * Where a term a picker offers comes from, which ranks it: the document itself, a vocabulary whose
 * namespace the document declares, or another vocabulary of the workspace.
 */
export type TermSource = 'document' | 'declared' | 'workspace';

/**
 * A term as an option of a picker shows it.
 */
export interface ResourceOptionData {
	/**
	 * The IRI of the term.
	 */
	subject: NamedNode;

	/**
	 * The label of the term, as the cards show it.
	 */
	label: string;

	/**
	 * The prefixed name of the term, with the prefixes of the document or the one it would declare.
	 */
	prefixedName?: string;

	/**
	 * The glyph of the term, by its types.
	 */
	iconName?: string;

	/**
	 * Where the term comes from.
	 */
	source: TermSource;

	/**
	 * The prefix the document would declare for the namespace of the term to write it by its
	 * prefixed name, where the document declares none for it.
	 */
	missingPrefix?: {
		/**
		 * The prefix, without the colon.
		 */
		prefix: string;

		/**
		 * The namespace IRI.
		 */
		namespace: string;
	};
}

/**
 * Where the statements of a resource are read from: the document, which they can be edited in, or
 * the store, which holds the other documents of the workspace and the vocabularies Mentor ships
 * with, and whose statements only read.
 */
export type ResourceSource = 'document' | 'store';

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
 * Why a document cannot be edited in the form editor: its text does not parse, it is a template
 * whose structure is generated, or the form editor does not edit its syntax. The webview puts it
 * into words.
 */
export type ReadOnlyReason = 'syntaxErrors' | 'template' | 'unsupportedSyntax';

/**
 * Everything the webview needs to render a document except the per-resource properties.
 */
export interface DocumentSnapshot {
	/**
	 * Version of the text document this snapshot was built from.
	 */
	version: number;

	/**
	 * Which build of the snapshots of the document this one is. A snapshot is built again for the
	 * same version when what it reads besides the text changes, such as the labels in the store,
	 * the settings or the language, so the statements about resources belong to a revision.
	 */
	revision: number;

	/**
	 * The URI of the document.
	 */
	uri: string;

	/**
	 * The file name of the document, shown as its title.
	 */
	fileName: string;

	/**
	 * The namespace declarations of the document.
	 */
	namespaces: NamespaceData[];

	/**
	 * The resources of the document, in document order.
	 */
	resources: ResourceListItemData[];

	/**
	 * The resource describing the document, such as its ontology, which heads the form.
	 */
	documentResource?: NamedNode;

	/**
	 * The comments written after the last statement of the document, which close it, as the
	 * lines of each run.
	 */
	trailingComments?: string[][];

	/**
	 * The spelling of each language tag the document writes, by its lower case form. Terms hold
	 * language tags in lower case; tags are shown in the document's spelling.
	 */
	languageTags: Record<string, string>;

	/**
	 * The language the document is read in, in lower case: the labels are read in it, and the form
	 * shows the literal values of this language. Absent when no language is chosen.
	 */
	activeLanguage?: string;

	/**
	 * Why the document cannot be edited, when it cannot.
	 */
	readOnly?: ReadOnlyReason;

	/**
	 * The parse problems of the document.
	 */
	problems: DocumentProblem[];

	/**
	 * The label predicates Mentor is configured with, most preferred first: the label row of a card
	 * shows the most preferred one the resource has.
	 */
	labelPredicates: NamedNode[];

	/**
	 * The description predicates Mentor is configured with, most preferred first, whose values a
	 * collapsed card shows as text of its own.
	 */
	descriptionPredicates: NamedNode[];

	/**
	 * The settings a property can be pinned in, in the order the pin menu offers them: the user
	 * settings, and the workspace settings where a workspace is open.
	 */
	pinScopes?: readonly ScopeKey[];
}
