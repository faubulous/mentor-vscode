import { StatementValue } from '@src/services/editing/statement-value';
import { Literal, NamedNode } from '@rdfjs/types';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PropertyView, TermView } from '../form-editor-model';
import { LiteralTag } from './literal-tag';
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
		const predicate = property.predicate.term.termType === 'NamedNode' ? property.predicate.term.value : undefined;

		return new StatementDraft(predicate, property.values.map(view => ({ kind: 'written', view })));
	}

	/**
	 * Indicate whether a property can be edited in a row: its predicate is written in the
	 * document, and every value has the anchor it is kept by.
	 * @param property The property.
	 * @returns `true` when the row can be edited.
	 */
	static canEdit(property: PropertyView): boolean {
		return property.predicate.editable && property.predicate.term.termType === 'NamedNode' && property.values.every(view => view.anchor !== undefined);
	}

	/**
	 * Whether the draft states a statement: it has a predicate and at least one value.
	 */
	get isComplete(): boolean {
		return this.predicate !== undefined && this._writtenValues.length > 0;
	}

	/**
	 * The values the draft writes: all but the new blank nodes no type was chosen for yet.
	 */
	private get _writtenValues(): readonly RowValue[] {
		return this.values.filter(value => !_isUntypedNode(value));
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
	withValueAppended(term: TermView['term']): StatementDraft {
		return new StatementDraft(this.predicate, [...this.values, { kind: 'term', term }]);
	}

	/**
	 * Add a new blank node after the others, which is written once its type is chosen.
	 * @returns The draft with the node.
	 */
	withNodeAppended(): StatementDraft {
		return new StatementDraft(this.predicate, [...this.values, { kind: 'term', term: RdfDataFactory.blankNode(), node: {} }]);
	}

	/**
	 * Choose the type of a new blank node, or take it back.
	 * @param index The index of the node among the values.
	 * @param type The type, or `undefined` for none.
	 * @returns The draft with the type, the draft itself when the value is no new blank node.
	 */
	withNodeType(index: number, type: NamedNode | undefined): StatementDraft {
		const value = this.values[index];

		if (value?.kind !== 'term' || !value.node) {
			return this;
		}

		return new StatementDraft(this.predicate, this.values.map((existing, position) => position === index ? { ...value, node: { type } } : existing));
	}

	/**
	 * Mark the new blank nodes as sent in an edit, or as not, when the edit was refused.
	 * @param sent Whether an edit writing them is on its way.
	 * @returns The draft with the nodes marked.
	 */
	withNodesSent(sent: boolean): StatementDraft {
		return new StatementDraft(this.predicate, this.values.map(value => value.kind === 'term' && value.node ? { ...value, node: { ...value.node, sent } } : value));
	}

	/**
	 * Drop the new blank nodes no type was chosen for, as leaving the row does.
	 * @returns The draft without them.
	 */
	withoutUntypedNodes(): StatementDraft {
		return this.values.some(_isUntypedNode) ? new StatementDraft(this.predicate, this._writtenValues) : this;
	}

	/**
	 * Add values after the others, as they are.
	 * @param values The values.
	 * @returns The draft with the values.
	 */
	withValuesAppended(values: readonly RowValue[]): StatementDraft {
		return new StatementDraft(this.predicate, [...this.values, ...values]);
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

		if (!value || term?.termType !== 'Literal') {
			return this;
		}

		return this._withLiteral(index, value, RdfDataFactory.literal(text, _tagOf(term)));
	}

	/**
	 * Give a literal value another language tag or datatype, keeping its text. Giving it the tag of
	 * the written value again restores the written value.
	 * @param index The index of the value.
	 * @param tag The language tag, or the IRI of the datatype; neither for plain text.
	 * @returns The draft with the tag, the draft itself when the value is no literal.
	 */
	withLiteralTag(index: number, tag: LiteralTag): StatementDraft {
		const value = this.values[index];
		const term = value ? _termOf(value) : undefined;

		if (!value || term?.termType !== 'Literal') {
			return this;
		}

		const direction = tag.language && tag.language.toLowerCase() === term.language ? term.direction : undefined;
		const languageOrDatatype = tag.language
			? (direction ? { language: tag.language, direction } : tag.language)
			: (tag.datatype ? RdfDataFactory.namedNode(tag.datatype) : undefined);

		return this._withLiteral(index, value, RdfDataFactory.literal(term.value, languageOrDatatype));
	}

	/**
	 * Put a changed literal in the place of a value. The written value is restored when the literal
	 * equals it again.
	 * @param index The index of the value.
	 * @param value The value.
	 * @param literal The changed literal.
	 * @returns The draft with the literal.
	 */
	private _withLiteral(index: number, value: RowValue, literal: Literal): StatementDraft {
		const original = value.kind === 'written' ? value.view : value.replaces;
		const next: RowValue = original?.term.equals(literal)
			? { kind: 'written', view: original }
			: { kind: 'term', term: literal, replaces: original };

		return new StatementDraft(this.predicate, this.values.map((existing, position) => position === index ? next : existing));
	}

	/**
	 * Carry the draft over to the statement as the document writes it now, after an edit was
	 * applied: a value the document writes now is kept by its new anchor, found by its term, or for
	 * a blank node, whose identifier the document gives anew, by its place among the blank nodes. A
	 * value the document no longer writes becomes a term to be written again. A new blank node stays
	 * as it is until an edit writing it was sent, and then counts among the blank nodes.
	 * @param stored The statement as the document writes it now.
	 * @returns The draft against that statement.
	 */
	rebasedOnto(stored: StatementDraft): StatementDraft {
		const available = stored.values.flatMap(value => value.kind === 'written' ? [value.view] : []);
		const used = new Set<TermView>();
		let blankNodes = 0;

		const values = this.values.map((value): RowValue => {
			if (value.kind === 'term' && value.node && !value.node.sent) {
				return value;
			}

			const term = _termOf(value);
			const match = term.termType === 'BlankNode'
				? available.filter(view => view.term.termType === 'BlankNode')[blankNodes++]
				: available.find(view => !used.has(view) && view.term.equals(term));

			if (match && !used.has(match)) {
				used.add(match);

				return { kind: 'written', view: match };
			}

			return value.kind === 'term' && value.node ? { ...value, node: { ...value.node, sent: false } } : { kind: 'term', term };
		});

		return new StatementDraft(stored.predicate ?? this.predicate, values);
	}

	/**
	 * Indicate whether another draft states the same values in the same order.
	 * @param other The other draft.
	 * @returns `true` for the same values.
	 */
	hasSameValues(other: StatementDraft): boolean {
		const values = this._writtenValues;
		const others = other._writtenValues;

		return values.length === others.length && values.every((value, index) => _sameValue(value, others[index]));
	}

	/**
	 * The values as the edit contract states them: written ones by their anchor, typed ones as terms,
	 * and new blank nodes with their type; a new blank node without a type is left out.
	 * @returns The values.
	 * @throws {Error} If a written value has no anchor, which a row that can be edited never has.
	 */
	toStatementValues(): StatementValue[] {
		return this._writtenValues.map((value): StatementValue => {
			if (value.kind === 'term' && value.node?.type) {
				return { kind: 'node', statements: [{ predicate: RDF.type, values: [{ kind: 'term', term: value.node.type }] }] };
			}

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
 * Indicate whether a value is a new blank node no type was chosen for yet.
 * @param value The value.
 * @returns `true` for such a node.
 */
function _isUntypedNode(value: RowValue): boolean {
	return value.kind === 'term' && value.node !== undefined && value.node.type === undefined;
}

/**
 * The term a value stands for.
 * @param value The value.
 * @returns The term.
 */
function _termOf(value: RowValue): TermView['term'] {
	return value.kind === 'written' ? value.view.term : value.term;
}

/**
 * The language tag, with its direction, or the datatype of a literal, as the data factory takes it.
 * @param literal The literal.
 * @returns The language tag or the datatype.
 */
function _tagOf(literal: Literal): string | { language: string; direction: 'ltr' | 'rtl' } | Literal['datatype'] {
	if (!literal.language) {
		return literal.datatype;
	}

	return literal.direction ? { language: literal.language, direction: literal.direction } : literal.language;
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

	return _termOf(first).equals(_termOf(second));
}
