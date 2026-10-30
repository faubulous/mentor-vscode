import { CollectionItemSpan, ObjectSpan, PredicateGroup, SubjectBlock } from './statement-model';
import { StatementValue } from './statement-value';

/**
 * A new value of an edit, written as one of the objects of a statement.
 */
export type NewValue = Exclude<StatementValue, { kind: 'existing' }>;

/**
 * One object of a statement as an edit leaves it: a value written in the document that stays, or
 * a new value.
 */
export type ValueListEntry =
	| { kind: 'kept'; span: ObjectSpan }
	| { kind: 'new'; value: NewValue };

/**
 * A statement of the predicate, a group of objects written under it, with what an edit makes of
 * it: the objects it holds afterwards in their order, and the objects that go.
 */
export interface ValueListGroup {
	/**
	 * The block the statement is written in.
	 */
	block: SubjectBlock;

	/**
	 * The statement.
	 */
	group: PredicateGroup;

	/**
	 * The objects the statement holds after the edit, in order.
	 */
	entries: ValueListEntry[];

	/**
	 * The objects written in the statement that the edit removes.
	 */
	removed: ObjectSpan[];

	/**
	 * Whether the objects that stay change their order.
	 */
	reordered: boolean;
}

/**
 * What an edit of the values of a predicate does to the statements that write them: one entry per
 * statement of the predicate, in document order, or no statements and the values of a predicate
 * the subject does not carry yet.
 */
export interface ValueList {
	/**
	 * The statements of the predicate.
	 */
	groups: ValueListGroup[];

	/**
	 * The values of a predicate the subject does not carry yet; empty when it carries it.
	 */
	added: NewValue[];

	/**
	 * The items of the lists written under the predicate, by the offset they start at.
	 */
	items: ReadonlyMap<number, CollectionItemSpan>;
}
