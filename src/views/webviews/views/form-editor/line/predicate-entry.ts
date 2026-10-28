import { ValueKind } from '@src/utilities/value-kind';

/**
 * A predicate the line editor knows: how it is written, what it means and what it takes.
 */
export interface PredicateEntry {
	/**
	 * The prefixed name, or `<iri>` when no prefix is declared.
	 */
	curie: string;

	/**
	 * The IRI.
	 */
	iri: string;

	/**
	 * The label shown for the predicate.
	 */
	label: string;

	/**
	 * What kind of values the predicate takes.
	 */
	range: ValueKind;
}
