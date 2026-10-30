import { FocusEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditOperation } from '@src/services/editing/edit-operation';
import { ValueKind } from '@src/utilities/value-kind';
import { PropertyView, TermRef } from '../form-editor-model';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { TypedTermReader } from '../services/statement/typed-term-reader';
import { CellKey } from '../state/cell-key';
import { IEditingController } from '../state/editing-controller.interface';
import { LiteralTag } from '../state/literal-tag';
import { StatementDraft } from '../state/statement-draft';
import { StatementRowState } from '../state/statement-row-state';

/**
 * What a statement row edits and where its edits go.
 */
export interface StatementRowOptions {
	/**
	 * The row, where the edits of the row report their failures.
	 */
	cellKey: CellKey;

	/**
	 * The resource the statement is about.
	 */
	subject: TermRef;

	/**
	 * The property the row shows, or none for a row a new statement is typed into.
	 */
	property?: PropertyView;

	/**
	 * How the predicate of the property is written in its field.
	 */
	predicateText: string;

	/**
	 * The document version the property belongs to, which the edits of the row are based on.
	 */
	version: number;

	/**
	 * Whether the property belongs to an earlier version while the current one loads; the row
	 * writes nothing until it is current.
	 */
	stale: boolean;

	/**
	 * Reads what is typed.
	 */
	reader: TypedTermReader;

	/**
	 * Hands the edits to the host.
	 */
	editing: IEditingController;

	/**
	 * Called with the statement typed into a row for a new statement once it was handed to the host.
	 */
	onSubmitted?: (statement: StatementDraft) => void;
}

/**
 * The state of a statement row and the handlers its fields are wired with.
 */
export interface StatementRowHandle {
	/**
	 * The state of the row.
	 */
	state: StatementRowState;

	/**
	 * Why each literal of the row does not fit its datatype, by the index of the value.
	 */
	literalProblems: ReadonlyMap<number, string>;

	/**
	 * Called with the text of the predicate field as it is typed.
	 */
	onPredicateInput(text: string): void;

	/**
	 * Called when the predicate field is left or confirmed, which takes the predicate it names.
	 */
	onPredicateCommit(): void;

	/**
	 * Called with the text of a literal as it is typed.
	 */
	onLiteralInput(index: number, text: string): void;

	/**
	 * Called with the language tag or datatype picked for a literal.
	 */
	onLiteralTag(index: number, tag: LiteralTag): void;

	/**
	 * Called with the text of the field for a new value as it is typed.
	 */
	onPendingInput(text: string): void;

	/**
	 * Called with a term picked or typed for a new value, which is added at once.
	 */
	onValueAdded(term: TermRef): void;

	/**
	 * Called when the text typed for a new value is confirmed, which adds the value it reads as.
	 */
	onPendingCommit(): void;

	/**
	 * Called to remove a value.
	 */
	onRemoveValue(index: number): void;

	/**
	 * Hands the keys of the row to it: Enter writes it, Escape gives up what was typed.
	 */
	onKeyDown(event: KeyboardEvent<HTMLElement>): void;

	/**
	 * Called when the focus leaves an element of the row, which writes the row once the focus is
	 * outside of it.
	 */
	onBlur(event: FocusEvent<HTMLElement>): void;
}

/**
 * The writes a row holds back while its previous edit is on its way or its property is stale.
 */
interface DeferredWrites {
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
 * Hold the state of a statement row and write it: a changed predicate as soon as its field is
 * left, the values once the focus leaves the row or Enter is pressed in a literal. A literal whose
 * text its datatype does not take is not written, and goes back to the stored value when the row
 * is left. A row for a new statement is written once it has a predicate and a value.
 *
 * Edits refer to written values by their offsets in the version they were built from, so a row
 * writes one edit at a time and only from the current version: while an edit of the row is on its
 * way, or its property is stale, further writes wait. Once the property arrives as the edit left
 * it, what was typed meanwhile is carried over to it and written.
 * @param options What the row edits and where its edits go.
 * @returns The state and the handlers.
 */
export function useStatementRow(options: StatementRowOptions): StatementRowHandle {
	const { property, predicateText, stale } = options;
	const stored = useMemo(() => property ? StatementDraft.fromProperty(property) : StatementDraft.EMPTY, [property]);
	const [state, setState] = useState(() => StatementRowState.of(stored, predicateText));
	const latest = useRef({ options, state });
	const inFlight = useRef(false);
	const deferred = useRef<DeferredWrites>({ predicate: false, values: false });

	latest.current = { options, state };

	const range: ValueKind = property?.valueKind?.kind ?? 'any';
	const literalProblems = useMemo(() => _literalProblemsOf(state.draft), [state.draft]);

	const update = useCallback((next: StatementRowState): void => {
		latest.current.state = next;
		setState(next);
	}, []);

	const submit = useCallback((operations: EditOperation[]): void => {
		const { options: current } = latest.current;

		inFlight.current = true;

		void current.editing.submit(operations, current.cellKey, current.version).then(outcome => {
			// A refused edit leaves the property as it was, so nothing arrives to wait for.
			if (!outcome.ok) {
				inFlight.current = false;
				deferred.current = { predicate: false, values: false };
			}
		});
	}, []);

	const writeValues = useCallback((draft: StatementDraft): void => {
		const { options: current, state: currentState } = latest.current;
		const predicate = current.property ? currentState.stored.predicate : draft.predicate;

		if (!predicate || (current.property ? draft.hasSameValues(currentState.stored) : !draft.isComplete)) {
			return;
		}

		if (inFlight.current || current.stale) {
			deferred.current.values = true;

			return;
		}

		submit([{ op: 'setValues', subject: current.subject, predicate, values: draft.toStatementValues() }]);
		current.onSubmitted?.(draft);
	}, [submit]);

	const writePredicate = useCallback((): void => {
		const { options: current, state: currentState } = latest.current;
		const reading = current.reader.readPredicate(currentState.predicateText);

		if (!reading.term || reading.term.kind !== 'iri') {
			update(currentState.withProblem(reading.problem ?? 'A predicate is an IRI.'));

			return;
		}

		const iri = reading.term.iri;

		if (!current.property || !currentState.stored.predicate) {
			update(currentState.withPredicate(iri));

			return;
		}

		if (iri === currentState.stored.predicate) {
			return;
		}

		if (inFlight.current || current.stale) {
			deferred.current.predicate = true;

			return;
		}

		submit([{ op: 'setPredicate', subject: current.subject, predicate: currentState.stored.predicate, newPredicate: iri }]);
	}, [submit, update]);

	// The stored statement changed: the row starts over from it when nothing typed is pending;
	// otherwise what was typed is carried over to it, and the writes held back go out.
	useEffect(() => {
		const current = latest.current.state;

		if (current.stored === stored) {
			return;
		}

		const predicateChanged = current.stored.predicate !== stored.predicate;
		const keep = current.dirty || inFlight.current;

		inFlight.current = false;
		update(keep
			? new StatementRowState(stored, current.draft.rebasedOnto(stored), predicateChanged ? predicateText : current.predicateText, current.pendingText, current.problem)
			: StatementRowState.of(stored, predicateText));
	}, [stored, predicateText, update]);

	// The writes held back go out once the property is current and no edit of the row is on its way.
	useEffect(() => {
		if (stale || inFlight.current) {
			return;
		}

		const writes = deferred.current;

		deferred.current = { predicate: false, values: false };

		if (writes.predicate) {
			writePredicate();
		}

		if (writes.values) {
			writeValues(latest.current.state.draft);
		}
	}, [stored, stale, writePredicate, writeValues]);

	const onPendingCommit = useCallback((): void => {
		const { options: current, state: currentState } = latest.current;
		const reading = current.reader.readValue(currentState.pendingText, range);

		if (reading?.term) {
			update(currentState.withValueAppended(reading.term));
		} else if (reading) {
			update(currentState.withProblem(reading.problem));
		}
	}, [range, update]);

	// Leaving writes the row: text typed for a new value is taken as one, literals whose text their
	// datatype does not take go back to what is stored, and text that reads as no term stays with
	// its problem shown rather than being lost.
	const leave = useCallback((): void => {
		const { options: current, state: currentState } = latest.current;
		const reading = current.reader.readValue(currentState.pendingText, range);
		const withPending = reading?.term ? currentState.draft.withValueAppended(reading.term) : currentState.draft;
		const next = currentState.withDraft(_withInvalidLiteralsReverted(withPending));

		update(reading?.term ? next.withPendingText('') : reading ? next.withProblem(reading.problem) : next);
		writeValues(next.draft);
	}, [range, update, writeValues]);

	const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>): void => {
		const { options: current, state: currentState } = latest.current;

		if (event.key === 'Escape') {
			event.preventDefault();
			update(StatementRowState.of(currentState.stored, current.predicateText));
		} else if (event.key === 'Enter' && !event.shiftKey && _literalProblemsOf(currentState.draft).size === 0) {
			writeValues(currentState.draft);
		}
	}, [update, writeValues]);

	const onBlur = useCallback((event: FocusEvent<HTMLElement>): void => {
		const next = event.relatedTarget;

		if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
			leave();
		}
	}, [leave]);

	return {
		state,
		literalProblems,
		onPredicateInput: text => update(latest.current.state.withPredicateText(text)),
		onPredicateCommit: writePredicate,
		onLiteralInput: (index, text) => update(latest.current.state.withLiteralText(index, text)),
		onLiteralTag: (index, tag) => update(latest.current.state.withLiteralTag(index, tag)),
		onValueAdded: term => update(latest.current.state.withValueAppended(term)),
		onPendingInput: text => update(latest.current.state.withPendingText(text)),
		onPendingCommit,
		onRemoveValue: index => update(latest.current.state.withoutValue(index)),
		onKeyDown,
		onBlur
	};
}

/**
 * Why each literal of a draft does not fit its datatype.
 * @param draft The draft.
 * @returns The reasons by the index of the value.
 */
function _literalProblemsOf(draft: StatementDraft): Map<number, string> {
	const problems = new Map<number, string>();

	draft.values.forEach((value, index) => {
		const problem = value.kind === 'term' ? LiteralDatatypes.problemOfTerm(value.term) : undefined;

		if (problem) {
			problems.set(index, problem);
		}
	});

	return problems;
}

/**
 * Put every literal whose text its datatype does not take back to the value it replaces, or drop
 * it when it replaces none.
 * @param draft The draft.
 * @returns The draft that can be written.
 */
function _withInvalidLiteralsReverted(draft: StatementDraft): StatementDraft {
	const problems = _literalProblemsOf(draft);

	if (problems.size === 0) {
		return draft;
	}

	const values = draft.values.flatMap((value, index) => {
		if (!problems.has(index) || value.kind !== 'term') {
			return [value];
		}

		return value.replaces ? [{ kind: 'written' as const, view: value.replaces }] : [];
	});

	return new StatementDraft(draft.predicate, values);
}
