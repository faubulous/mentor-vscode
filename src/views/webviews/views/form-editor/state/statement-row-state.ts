import { TermRef } from '../form-editor-model';
import { TermProblem } from '../services/statement/term-problem';
import { StatementDraft } from './statement-draft';

/**
 * The state of one statement row while it is edited: the statement as stored and as edited, the
 * text of the predicate field and of the field a new value is typed into, and why the last thing
 * typed could not be read. Immutable: every transition returns the next state.
 */
export class StatementRowState {
	/**
	 * Create a state.
	 * @param stored The statement as the document writes it.
	 * @param draft The statement as edited.
	 * @param predicateText The text of the predicate field.
	 * @param pendingText The text typed for a new value.
	 * @param problem Why the last thing typed could not be read.
	 */
	constructor(
		readonly stored: StatementDraft,
		readonly draft: StatementDraft,
		readonly predicateText: string,
		readonly pendingText = '',
		readonly problem?: TermProblem
	) { }

	/**
	 * The state of a row showing a statement as stored.
	 * @param stored The statement.
	 * @param predicateText How the predicate is written.
	 * @returns The state.
	 */
	static of(stored: StatementDraft, predicateText: string): StatementRowState {
		return new StatementRowState(stored, stored, predicateText);
	}

	/**
	 * Whether the values differ from the stored ones.
	 */
	get valuesChanged(): boolean {
		return !this.draft.hasSameValues(this.stored);
	}

	/**
	 * Whether anything was typed that is not stored yet.
	 */
	get dirty(): boolean {
		return this.valuesChanged || this.draft.predicate !== this.stored.predicate || this.pendingText.trim() !== '';
	}

	/**
	 * Replace the text of the predicate field.
	 * @param text The text.
	 * @returns The next state.
	 */
	withPredicateText(text: string): StatementRowState {
		return new StatementRowState(this.stored, this.draft, text, this.pendingText);
	}

	/**
	 * Take the predicate the predicate field names.
	 * @param iri The IRI of the predicate.
	 * @returns The next state.
	 */
	withPredicate(iri: string): StatementRowState {
		return new StatementRowState(this.stored, this.draft.withPredicate(iri), this.predicateText, this.pendingText);
	}

	/**
	 * Replace the text typed for a new value.
	 * @param text The text.
	 * @returns The next state.
	 */
	withPendingText(text: string): StatementRowState {
		return new StatementRowState(this.stored, this.draft, this.predicateText, text);
	}

	/**
	 * Add the value the text typed for a new value reads as, and empty its field.
	 * @param term The term.
	 * @returns The next state.
	 */
	withValueAppended(term: TermRef): StatementRowState {
		return new StatementRowState(this.stored, this.draft.withValueAppended(term), this.predicateText);
	}

	/**
	 * Change the text of a literal value.
	 * @param index The index of the value.
	 * @param text The text.
	 * @returns The next state.
	 */
	withLiteralText(index: number, text: string): StatementRowState {
		return new StatementRowState(this.stored, this.draft.withLiteralText(index, text), this.predicateText, this.pendingText, this.problem);
	}

	/**
	 * Remove a value.
	 * @param index The index of the value.
	 * @returns The next state.
	 */
	withoutValue(index: number): StatementRowState {
		return new StatementRowState(this.stored, this.draft.withoutValue(index), this.predicateText, this.pendingText, this.problem);
	}

	/**
	 * Replace the edited statement, as leaving the row with values that cannot be written does.
	 * @param draft The statement.
	 * @returns The next state.
	 */
	withDraft(draft: StatementDraft): StatementRowState {
		return new StatementRowState(this.stored, draft, this.predicateText, this.pendingText, this.problem);
	}

	/**
	 * Show why the last thing typed could not be read.
	 * @param problem The reason.
	 * @returns The next state.
	 */
	withProblem(problem: TermProblem): StatementRowState {
		return new StatementRowState(this.stored, this.draft, this.predicateText, this.pendingText, problem);
	}
}
