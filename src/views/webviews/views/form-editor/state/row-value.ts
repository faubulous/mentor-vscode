import { NamedNode } from '@rdfjs/types';
import { TermView } from '../form-editor-model';

/**
 * One value of a statement row while it is edited: a value as it is written in the document,
 * kept by its anchor, or a term the user typed or changed, which is written anew. A changed term
 * remembers the written value it takes the place of, so typing the original text again restores it.
 * A new blank node the row is to write in place, as `[` starts one, is a term of a blank node with
 * its type, once one is chosen; it is written with its type, and not at all without one. A copy of
 * a written value, as Duplicate makes, is a new blank node too, written as a copy of the value's
 * text. Once an edit writing a new node is sent, it is found among the blank nodes the document
 * then writes.
 */
export type RowValue =
	| { kind: 'written'; view: TermView }
	| { kind: 'term'; term: TermView['term']; replaces?: TermView; node?: { type?: NamedNode; copyOf?: TermView; sent?: boolean } };
