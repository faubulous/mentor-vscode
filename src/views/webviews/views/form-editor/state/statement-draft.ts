import { StatementValue } from '@src/services/editing/statement-value';
import { PropertyView, TermRef, TermView } from '../form-editor-model';
import { RowValue } from './row-value';

/**
 * A statement as a row edits it: the IRI of its predicate and its values, written ones kept by
 * their anchor and typed ones as terms. Immutable: every change returns a new draft.
 */
export class StatementDraft {
	/**
	 * The draft of a row for a new statement.
	 */
	static readonly EMPTY = new StatementDraft(undefined, []);

	/**
	 * Create a draft.
	 * @param predicate The IRI of the predicate, until one is chosen `undefined`.
	 * @param values The values, in order.
	 */
	constructor(readonly predicate: string | undefined, readonly values: readonly RowValue[]) { }

	/**
	 * The draft of a property as the document writes it.
	 * @param property The property.
	 * @returns The draft.
	 */
	static fromProperty(property: PropertyView): StatementDraft {
		const predicate = property.predicate.term.kind === 'iri' ? property.predicate.term.iri : undefined;

		return new StatementDraft(predicate, property.values.map(view => ({ kind: 'written', view })));
	}

	/**
	 * Indicate whether a property can be edited in a row: its predicate is written in the
	 * document, and every value has the anchor it is kept by.
	 * @param property The property.
	 * @returns `true` when the row can be edited.
	 */
	static canEdit(property: PropertyView): boolean {
		return property.predicate.editable && property.predicate.term.kind === 'iri' && property.values.every(view => view.anchor !== undefined);
	}

	/**
	 * Whether the draft states a statement: it has a predicate and at least one value.
	 */
	get isComplete(): boolean {
		return this.predicate !== undefined && this.values.length > 0;
	}

	/**
	 * Choose the predicate.
	 * @param predicate The IRI of the predicate.
	 * @returns The draft with the predicate.
	 */
	withPredicate(predicate: string): StatementDraft {
		return new StatementDraft(predicate, this.values);
	}

	/**
	 * Add a value after the others.
	 * @param term The term of the value.
	 * @returns The draft with the value.
	 */
	withValueAppended(term: TermRef): StatementDraft {
		return new StatementDraft(this.predicate, [...this.values, { kind: 'term', term }]);
	}

	/**
	 * Remove a value.
	 * @param index The index of the value.
	 * @returns The draft without the value.
	 */
	withoutValue(index: number): StatementDraft {
		return new StatementDraft(this.predicate, this.values.filter((_, position) => position !== index));
	}

	/**
	 * Change the text of a literal value, keeping its language tag or datatype. Typing the text
	 * of the written value again restores the written value.
	 * @param index The index of the value.
	 * @param text The text.
	 * @returns The draft with the text, the draft itself when the value is no literal.
	 */
	withLiteralText(index: number, text: string): StatementDraft {
		const value = this.values[index];
		const term = value ? _termOf(value) : undefined;

		if (!value || term?.kind !== 'literal') {
			return this;
		}

		const original = value.kind === 'written' ? value.view : value.replaces;
		const next: RowValue = original?.term.kind === 'literal' && original.term.value === text && _sameTag(original.term, term)
			? { kind: 'written', view: original }
			: { kind: 'term', term: { ...term, value: text }, replaces: original };

		return new StatementDraft(this.predicate, this.values.map((existing, position) => position === index ? next : existing));
	}

	/**
	 * Carry the draft over to the statement as the document writes it now, after an edit was
	 * applied: a value the document writes now is kept by its new anchor, found by its term, or for
	 * a blank node, whose identifier the document gives anew, by its place among the blank nodes. A
	 * value the document no longer writes becomes a term to be written again.
	 * @param stored The statement as the document writes it now.
	 * @returns The draft against that statement.
	 */
	rebasedOnto(stored: StatementDraft): StatementDraft {
		const available = stored.values.flatMap(value => value.kind === 'written' ? [value.view] : []);
		const used = new Set<TermView>();
		let blankNodes = 0;

		const values = this.values.map((value): RowValue => {
			const term = _termOf(value);
			const match = term.kind === 'bnode'
				? available.filter(view => view.term.kind === 'bnode')[blankNodes++]
				: available.find(view => !used.has(view) && JSON.stringify(view.term) === JSON.stringify(term));

			if (match && !used.has(match)) {
				used.add(match);

				return { kind: 'written', view: match };
			}

			return { kind: 'term', term };
		});

		return new StatementDraft(stored.predicate ?? this.predicate, values);
	}

	/**
	 * Indicate whether another draft states the same values in the same order.
	 * @param other The other draft.
	 * @returns `true` for the same values.
	 */
	hasSameValues(other: StatementDraft): boolean {
		return this.values.length === other.values.length && this.values.every((value, index) => _sameValue(value, other.values[index]));
	}

	/**
	 * The values as the edit contract states them: written ones by their anchor, typed ones as terms.
	 * @returns The values.
	 * @throws {Error} If a written value has no anchor, which a row that can be edited never has.
	 */
	toStatementValues(): StatementValue[] {
		return this.values.map(value => {
			if (value.kind === 'term') {
				return { kind: 'term', term: value.term };
			}

			if (value.view.anchor === undefined) {
				throw new Error('A written value without an anchor cannot be kept.');
			}

			return { kind: 'existing', anchor: value.view.anchor };
		});
	}
}

/**
 * The term a value stands for.
 * @param value The value.
 * @returns The term.
 */
function _termOf(value: RowValue): TermRef {
	return value.kind === 'written' ? value.view.term : value.term;
}

/**
 * Indicate whether two literals carry the same language tag and datatype.
 * @param first The first literal.
 * @param second The second literal.
 * @returns `true` for the same tag.
 */
function _sameTag(first: Extract<TermRef, { kind: 'literal' }>, second: Extract<TermRef, { kind: 'literal' }>): boolean {
	return (first.language ?? '') === (second.language ?? '') && (first.datatype ?? '') === (second.datatype ?? '');
}

/**
 * Indicate whether two values are the same: the same written value, or equal terms.
 * @param first The first value.
 * @param second The second value.
 * @returns `true` for the same value.
 */
function _sameValue(first: RowValue, second: RowValue | undefined): boolean {
	if (!second || first.kind !== second.kind) {
		return false;
	}

	if (first.kind === 'written' && second.kind === 'written') {
		return first.view.anchor === second.view.anchor;
	}

	return JSON.stringify(_termOf(first)) === JSON.stringify(_termOf(second));
}
