import { EditOperation } from '@src/services/editing/edit-operation';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { ValueKind } from '@src/utilities/value-kind';
import { PropertyView, TermView } from '../form-editor-model';
import { EditOutcome } from '../services/editing-host-service.interface';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { EditWriter } from './edit-writer';
import { IEditingController } from './editing-controller.interface';
import { LiteralTag } from './literal-tag';
import { RowValue } from './row-value';
import { StatementDraft } from './statement-draft';
import { StatementRowData } from './statement-row-data';
import { StatementRowOwner } from './statement-row-owner';
import { StatementRowState } from './statement-row-state';

/**
 * The writes a row asked for that have not gone out yet.
 */
interface QueuedWrites {
	/**
	 * Whether the predicate field names a predicate to be written.
	 */
	predicate: boolean;

	/**
	 * Whether the values are to be written.
	 */
	values: boolean;
}

/**
 * Edits one statement row of a card and writes it: a changed predicate as soon as its field is
 * left, the values once the focus leaves the row or Enter is pressed in a literal. A literal whose
 * text its datatype does not take is not written, and goes back to the stored value when the row
 * is left. A row for a new statement is written once it has a predicate and a value; when the card
 * already shows its predicate, its values go into that row instead.
 *
 * The row hands its writes to the {@link IEditingController}, which asks for the operations only
 * when they can be sent, so they are built from the current version. Once an edit is applied, the
 * row waits for the property as the edit left it and carries what was typed meanwhile over to it.
 * A row that wrote a new predicate or a new statement claims the property of that predicate, so
 * the card keeps the row, and with it the focus, when the property arrives.
 *
 * The card hands the row its data while it renders, which re-renders the row; everything else the
 * row tells its subscribers.
 */
export class StatementRowEditor implements EditWriter {
	private readonly _listeners = new Set<() => void>();

	private _data: StatementRowData;

	private _state: StatementRowState;

	private _writes: QueuedWrites = { predicate: false, values: false };

	private _sending = false;

	private _awaitedVersion?: number;

	private _claimedPredicate?: string;

	private _submitted = false;

	private _retired = false;

	private _unfitting?: { draft: StatementDraft; indexes: ReadonlySet<number> };

	/**
	 * Create the editor of a row.
	 * @param id The identifier of the row, unique within its card, which keys it while it lives.
	 * @param _editing Writes the row.
	 * @param _owner The rows of the card.
	 * @param data The data of the row.
	 */
	constructor(
		readonly id: number,
		private readonly _editing: IEditingController,
		private readonly _owner: StatementRowOwner,
		data: StatementRowData
	) {
		this._data = data;
		this._state = StatementRowState.of(_storedOf(data), data.predicateText);
	}

	/**
	 * The state of the row.
	 */
	get state(): StatementRowState {
		return this._state;
	}

	/**
	 * The property the row shows, or none for a row a new statement is typed into.
	 */
	get property(): PropertyView | undefined {
		return this._data.property;
	}

	/**
	 * Whether the row is one a new statement is typed into.
	 */
	get isNew(): boolean {
		return this._data.property === undefined;
	}

	/**
	 * Whether the row is waiting for a new statement: it is new and nothing was handed over from it.
	 */
	get isOpen(): boolean {
		return this.isNew && !this._submitted;
	}

	/**
	 * The predicate a written edit is to make the row show, until the row shows it.
	 */
	get claimedPredicate(): string | undefined {
		return this._claimedPredicate;
	}

	get subject(): NamedNode | BlankNode {
		return this._data.subject;
	}

	get card(): NamedNode | BlankNode {
		return this._data.card;
	}

	get version(): number {
		return this._data.version;
	}

	get busy(): boolean {
		return this.wantsToWrite || this._sending || this._awaitedVersion !== undefined;
	}

	get ready(): boolean {
		return !this._data.stale && !this._sending && this._awaitedVersion === undefined;
	}

	get wantsToWrite(): boolean {
		return this._writes.predicate || this._writes.values;
	}

	/**
	 * The indexes of the literals of the row whose text their datatype does not take.
	 */
	get unfittingLiterals(): ReadonlySet<number> {
		const draft = this._state.draft;

		if (this._unfitting?.draft !== draft) {
			this._unfitting = { draft, indexes: _unfittingLiteralsOf(draft) };
		}

		return this._unfitting.indexes;
	}

	/**
	 * Subscribe to the changes of the row.
	 * @param listener Invoked on every change.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);

		return () => this._listeners.delete(listener);
	}

	/**
	 * Take in the data of the row as the card renders. A changed property starts the row over from
	 * it when nothing typed is pending; otherwise what was typed is carried over to it. Called while
	 * the card renders, so it tells no subscriber: the row renders with the card.
	 * @param data The data.
	 */
	deliver(data: StatementRowData): void {
		const previous = this._data.property;

		this._data = data;

		if (this._awaitedVersion !== undefined && !data.stale && data.version >= this._awaitedVersion) {
			this._awaitedVersion = undefined;
		}

		if (data.property === previous) {
			return;
		}

		const stored = _storedOf(data);

		if (data.property && stored.predicate === this._claimedPredicate) {
			this._claimedPredicate = undefined;
			this._submitted = false;
		}

		const keep = this._state.dirty || this._sending || this._awaitedVersion !== undefined || this.wantsToWrite;

		this._state = keep
			? this._state.rebasedOnto(stored, data.predicateText)
			: StatementRowState.of(stored, data.predicateText).withRejection(this._state.rejection);
	}

	/**
	 * Give the row up, as its card does once the property of the row is gone: writes asked for
	 * are dropped, and an applied edit is not waited for. A write on its way still ends.
	 */
	retire(): void {
		this._retired = true;
		this._writes = { predicate: false, values: false };
		this._awaitedVersion = undefined;
	}

	/**
	 * Take the text of the predicate field as it is typed.
	 * @param text The text.
	 */
	inputPredicate(text: string): void {
		this._update(this._state.withPredicateText(text));
	}

	/**
	 * Take the predicate the predicate field names, as leaving or confirming the field does: a row
	 * for a new statement keeps it until the row is written, any other row writes it.
	 */
	commitPredicate(): void {
		const reading = this._data.reader.readPredicate(this._state.predicateText);

		if (!reading.term) {
			this._update(this._state.withProblem(reading.problem));

			return;
		}

		if (this.isNew) {
			this._update(this._state.withPredicate(reading.term.value));
		} else if (reading.term.value !== this._state.stored.predicate) {
			this._request('predicate');
		}
	}

	/**
	 * Take the text of a literal as it is typed.
	 * @param index The index of the value.
	 * @param text The text.
	 */
	inputLiteral(index: number, text: string): void {
		this._update(this._state.withLiteralText(index, text));
	}

	/**
	 * Give a literal another language tag or datatype, as the tag picker does.
	 * @param index The index of the value.
	 * @param tag The tag.
	 */
	inputLiteralTag(index: number, tag: LiteralTag): void {
		this._update(this._state.withLiteralTag(index, tag));
	}

	/**
	 * Take the first text typed into the empty field of a language the row lacks: it becomes a
	 * literal of the language after the other values. Nothing typed adds nothing.
	 * @param language The language tag.
	 * @param text The text.
	 */
	inputMissingLiteral(language: string, text: string): void {
		if (text !== '') {
			this._update(this._state.withDraft(this._state.draft.withValueAppended(RdfDataFactory.literal(text, language))));
		}
	}

	/**
	 * Take the text of the field for a new value as it is typed.
	 * @param text The text.
	 */
	inputPending(text: string): void {
		this._update(this._state.withPendingText(text));
	}

	/**
	 * Add a value picked or typed for the field of a new value, and empty the field.
	 * @param term The term.
	 */
	addValue(term: TermView['term']): void {
		this._update(this._state.withValueAppended(term));
	}

	/**
	 * Add the value the text typed for a new value reads as, or show why it reads as none.
	 */
	commitPending(): void {
		const reading = this._data.reader.readValue(this._state.pendingText, this._range);

		if (reading?.term) {
			this._update(this._state.withValueAppended(reading.term));
		} else if (reading) {
			this._update(this._state.withProblem(reading.problem));
		}
	}

	/**
	 * Remove a value.
	 * @param index The index of the value.
	 */
	removeValue(index: number): void {
		this._update(this._state.withoutValue(index));
	}

	/**
	 * Add values after the others and write them, as a new statement of the predicate of the row
	 * does.
	 * @param values The values.
	 */
	appendValues(values: readonly RowValue[]): void {
		this._update(this._state.withDraft(this._state.draft.withValuesAppended(values.filter(value => value.kind === 'term'))));
		this._requestValues();
	}

	/**
	 * Start a new blank node after the values, as `[` in the empty input of a new value does. It is
	 * written once its type is chosen.
	 */
	addNode(): void {
		this._update(this._state.withDraft(this._state.draft.withNodeAppended()));
	}

	/**
	 * Choose the type of a new blank node, or take it back.
	 * @param index The index of the node among the values.
	 * @param type The type, or `undefined` for none.
	 */
	setNodeType(index: number, type: NamedNode | undefined): void {
		this._update(this._state.withDraft(this._state.draft.withNodeType(index, type)));
	}

	/**
	 * Add a copy of a written value after it and write the row, as Duplicate does.
	 * @param index The index of the value.
	 */
	duplicateValue(index: number): void {
		this._update(this._state.withDraft(this._state.draft.withValueCopied(index)));
		this._requestValues();
	}

	/**
	 * Remove the property with all its values and write that, as the remove button of a row does.
	 */
	removeProperty(): void {
		this._update(this._state.withDraft(new StatementDraft(this._state.draft.predicate, [])));
		this._requestValues();
	}

	/**
	 * Give up what was typed, as Escape does. A row for a new statement is handed back to the card,
	 * which closes it.
	 */
	revert(): void {
		this._update(StatementRowState.of(this._state.stored, this._data.predicateText).withRejection(this._state.rejection));

		if (this.isOpen) {
			this._owner.abandoned(this);
		}
	}

	/**
	 * Write the values unless a literal does not fit its datatype, as Enter does.
	 */
	confirm(): void {
		if (this.unfittingLiterals.size === 0) {
			this._requestValues();
		}
	}

	/**
	 * Write the row as the focus leaves it: text typed for a new value is taken as one, literals
	 * whose text their datatype does not take go back to what is stored, and text that reads as no
	 * term stays with its problem shown rather than being lost. New blank nodes no type was chosen
	 * for go. A row for a new statement left with nothing typed is handed back to the card, which
	 * closes it.
	 */
	leave(): void {
		const draft = this._state.draft.withoutUntypedNodes();

		if (this.isOpen && this._state.predicateText === '' && this._state.pendingText === '' && draft.values.length === 0) {
			this._owner.abandoned(this);

			return;
		}
		const reading = this._data.reader.readValue(this._state.pendingText, this._range);
		const withPending = reading?.term ? draft.withValueAppended(reading.term) : draft;
		const next = this._state.withDraft(_withUnfittingLiteralsReverted(withPending));

		this._update(reading?.term ? next.withPendingText('') : reading ? next.withProblem(reading.problem) : next);
		this._requestValues();
	}

	/**
	 * Stop showing why the row was not written.
	 */
	dismissRejection(): void {
		this._update(this._state.withRejection(undefined));
	}

	takeEdit(): EditOperation[] | undefined {
		let operation: EditOperation | undefined;

		if (this._writes.predicate) {
			this._writes.predicate = false;
			operation = this._predicateEdit();
		}

		if (!operation && this._writes.values) {
			this._writes.values = false;
			operation = this._valuesEdit();
		}

		if (!operation) {
			return undefined;
		}

		this._sending = true;
		this._update(this._state.withRejection(undefined));

		return [operation];
	}

	settle(outcome: EditOutcome): void {
		this._sending = false;

		if (outcome.ok) {
			this._awaitedVersion = this._retired ? undefined : outcome.version;

			return;
		}

		this._writes = { predicate: false, values: false };
		this._claimedPredicate = undefined;
		this._submitted = false;
		this._update(this._state.withDraft(this._state.draft.withNodesSent(false)).withRejection({ kind: 'refused', problem: outcome.problem }));
	}

	/**
	 * What the predicate takes, as its values tell.
	 */
	private get _range(): ValueKind {
		return this._data.property?.valueKind?.kind ?? 'any';
	}

	/**
	 * Ask for the values to be written when they differ from what is stored, or for a new row,
	 * once they state a statement.
	 */
	private _requestValues(): void {
		const draft = this._state.draft;

		if (this.isNew ? !draft.isComplete : draft.hasSameValues(this._state.stored)) {
			return;
		}

		if (this.isNew && !this._submitted) {
			this._submitted = true;
			this._owner.submitted(this);
		}

		this._request('values');
	}

	/**
	 * Queue a write and hand the row to the controller.
	 * @param write The write.
	 */
	private _request(write: keyof QueuedWrites): void {
		this._writes[write] = true;
		this._editing.requestWrite(this);
	}

	/**
	 * Build the edit of the predicate the predicate field names, now that it can be sent.
	 * @returns The operation, or `undefined` when the field names the stored predicate or none.
	 */
	private _predicateEdit(): EditOperation | undefined {
		const reading = this._data.reader.readPredicate(this._state.predicateText);
		const predicate = this._state.stored.predicate;

		if (!reading.term || !predicate || reading.term.value === predicate) {
			return undefined;
		}

		this._claimedPredicate = reading.term.value;

		return { op: 'setPredicate', subject: this._data.subject, predicate, newPredicate: reading.term.value };
	}

	/**
	 * Build the edit of the values, now that it can be sent. A new statement whose predicate the
	 * card shows goes into the row of that predicate instead, since writing it on its own would
	 * replace the values of the predicate.
	 * @returns The operation, or `undefined` when there is nothing to write here.
	 */
	private _valuesEdit(): EditOperation | undefined {
		const draft = this._state.draft;

		if (!this.isNew) {
			const predicate = this._state.stored.predicate;

			return predicate && !draft.hasSameValues(this._state.stored)
				? this._setValues(predicate, draft)
				: undefined;
		}

		if (!draft.predicate || !draft.isComplete) {
			this._submitted = false;

			return undefined;
		}

		const row = this._owner.rowOf(draft.predicate);

		if (row === 'notEditable') {
			this._submitted = false;
			this._update(this._state.withRejection({ kind: 'predicateNotEditable', predicate: draft.predicate }));

			return undefined;
		}

		if (row) {
			row.appendValues(draft.values);
			this._owner.merged(this);

			return undefined;
		}

		this._claimedPredicate = draft.predicate;

		return this._setValues(draft.predicate, draft);
	}

	/**
	 * Build the edit that writes the values of a draft, and mark its new blank nodes as sent, so
	 * they are found among the blank nodes the edit writes.
	 * @param predicate The IRI of the predicate.
	 * @param draft The draft.
	 * @returns The edit.
	 */
	private _setValues(predicate: string, draft: StatementDraft): EditOperation {
		this._state = this._state.withDraft(draft.withNodesSent(true));

		return { op: 'setValues', subject: this._data.subject, predicate, values: draft.toStatementValues() };
	}

	/**
	 * Replace the state and tell the subscribers.
	 * @param state The next state.
	 */
	private _update(state: StatementRowState): void {
		this._state = state;

		for (const listener of this._listeners) {
			listener();
		}
	}
}

/**
 * The statement a row starts from: its property, else the predicate it is given, else nothing.
 * @param data The data of the row.
 * @returns The statement.
 */
function _storedOf(data: StatementRowData): StatementDraft {
	if (data.property) {
		return StatementDraft.fromProperty(data.property);
	}

	return data.predicate ? new StatementDraft(data.predicate, []) : StatementDraft.EMPTY;
}

/**
 * Find the literals of a draft whose text their datatype does not take.
 * @param draft The draft.
 * @returns The indexes of the values.
 */
function _unfittingLiteralsOf(draft: StatementDraft): Set<number> {
	const unfitting = new Set<number>();

	draft.values.forEach((value, index) => {
		if (value.kind === 'term' && !LiteralDatatypes.fitsTerm(value.term)) {
			unfitting.add(index);
		}
	});

	return unfitting;
}

/**
 * Put every literal whose text its datatype does not take back to the value it replaces, or drop
 * it when it replaces none.
 * @param draft The draft.
 * @returns The draft that can be written.
 */
function _withUnfittingLiteralsReverted(draft: StatementDraft): StatementDraft {
	const unfitting = _unfittingLiteralsOf(draft);

	if (unfitting.size === 0) {
		return draft;
	}

	const values = draft.values.flatMap((value, index) => {
		if (!unfitting.has(index) || value.kind !== 'term') {
			return [value];
		}

		return value.replaces ? [{ kind: 'written' as const, view: value.replaces }] : [];
	});

	return new StatementDraft(draft.predicate, values);
}
