/**
 * What the completion popup can offer: predicates, classes, resources, languages, datatypes or
 * the declaration of a prefix.
 */
export type FieldCompletionKind = 'predicate' | 'class' | 'resource' | 'language' | 'datatype' | 'prefix';

/**
 * What the completion popup offers for the field that has the focus.
 */
export interface FieldCompletionScope {
	/**
	 * What is offered.
	 */
	kind: FieldCompletionKind;

	/**
	 * The text typed so far, which ranks the candidates.
	 */
	query: string;
}
