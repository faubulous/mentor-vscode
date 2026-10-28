/**
 * A line the user opened for a new statement, placed after or before the row it was opened
 * from, or at the end of the card.
 */
export interface DraftLine {
	/**
	 * The identifier of the draft, unique within its card.
	 */
	id: number;

	/**
	 * The key of the row the draft follows.
	 */
	afterKey?: string;

	/**
	 * The key of the row the draft precedes, when it does not follow one.
	 */
	beforeKey?: string;

	/**
	 * The text the draft was committed with, kept until the host shows the statement or the user
	 * fixes it.
	 */
	committed?: string;

	/**
	 * The predicate IRI the draft was committed as, by which the statement of the host is
	 * recognised.
	 */
	predicate?: string;

	/**
	 * Whether the resource stated the predicate already when the draft was committed.
	 */
	statedBefore?: boolean;
}
