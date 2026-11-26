/**
 * Data transfer objects shared by the form editor host and webview. They cross the `postMessage`
 * boundary as plain data: the RDF/JS terms in them arrive without their methods and are revived
 * on arrival with `reviveTerms`. They must not reference any VS Code type. This file is bundled
 * into the webview and must stay free of imports from 'vscode'.
 */

import type { NamedNode } from '@rdfjs/types';
import type { ScopeKey } from '@src/utilities/config-scope';
import type { NamespaceData, ResourceListItemData } from '@src/services/resource/resource-card-data';

// The terms the pickers search and the ranges of predicates are shared with the text editor's
// completion; the form editor exchanges them as they are.
export type { ResourceOptionData, TermFit, TermSearch, TermSearchStatement, TermSearchTargetType, TermSource } from '@src/services/vocabulary/term-search';
export type { PredicateRangeData } from '@src/services/vocabulary/predicate-range';

// The data of the resource cards is shared with the tooltips of the definition tree and the
// text editor; the form editor exchanges it as it is.
export type { DocumentPosition, TermData, NestedResourceData, PredicateData, ResourcePillData, ResourceCardHeaderData, ResourceListItemData, PinnedProperty, ResourceCardBodyData, NamespaceData } from '@src/services/resource/resource-card-data';

/**
 * Where the statements of a resource are read from: the document, which they can be edited in, or
 * the store, which holds the other documents of the workspace and the vocabularies Mentor ships
 * with, and whose statements only read.
 */
export type ResourceSource = 'document' | 'store';

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
