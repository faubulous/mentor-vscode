import { TermRef, TermView } from '../form-editor-model';

/**
 * One value of a statement row while it is edited: a value as it is written in the document,
 * kept by its anchor, or a term the user typed or changed, which is written anew. A changed term
 * remembers the written value it takes the place of, so typing the original text again restores it.
 */
export type RowValue =
	| { kind: 'written'; view: TermView }
	| { kind: 'term'; term: TermRef; replaces?: TermView };
