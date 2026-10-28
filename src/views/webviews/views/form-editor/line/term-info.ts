import { ValueKind } from '@src/utilities/value-kind';
import { BareDatatype } from './line-lexer';

/**
 * What the first token of a line denotes: a predicate with its label and range, or the reason
 * it is not one.
 */
export type PredicateInfo =
	| { error?: undefined; curie: string; iri: string; label: string; range: ValueKind }
	| { error: string };

/**
 * The kinds a value token can be: a quoted literal, a dangling language tag, a number or boolean
 * written without quotes, an IRI reference outside the vocabulary, a vocabulary term, a resource
 * of this document, a prefixed name that is not described yet, a `[` typed for a new nested
 * node, or an error.
 */
export type LineValueKind = 'literal' | 'languageTag' | 'shorthandLiteral' | 'externalResource' | 'vocabularyTerm' | 'documentResource' | 'newResource' | 'nestedNode' | 'error';

/**
 * The kinds of value that denote a resource.
 */
export type ResourceValueKind = Extract<LineValueKind, 'vocabularyTerm' | 'documentResource' | 'newResource' | 'externalResource'>;

/**
 * What a value token denotes.
 */
export interface ValueInfo {
	/**
	 * The kind of the value.
	 */
	kind: LineValueKind;

	/**
	 * The label to show for a resource.
	 */
	label?: string;

	/**
	 * The IRI of a resource.
	 */
	iri?: string;

	/**
	 * The prefixed name of a resource, or its `<iri>` text.
	 */
	curie?: string;

	/**
	 * The datatype of a number or boolean written without quotes.
	 */
	datatype?: BareDatatype;

	/**
	 * Why the token is not a valid value.
	 */
	error?: string;
}

/**
 * How a resource value is shown as a pill: its label, the kind its ring is drawn for, and the
 * name shown on hover.
 */
export interface PillDisplay {
	/**
	 * The text of the pill.
	 */
	label: string;

	/**
	 * A vocabulary term, a resource of this document, a resource not described yet, one known
	 * only by its IRI, or an error.
	 */
	kind: ResourceValueKind | 'error';

	/**
	 * The name shown on hover.
	 */
	title: string;

	/**
	 * The icon the definition tree shows for the resource, when it is known.
	 */
	iconName?: string;
}
