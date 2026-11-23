import { useEffect, useMemo, useRef, useState } from 'react';
import { termToString } from 'rdf-string';
import { ResourceOptionData, TermSearchStatement, TermSearchTargetType } from '../form-editor-model';
import { TERM_SEARCH_LIMIT } from '@src/services/vocabulary/term-search';
import { SequentialTermSearch } from '../services/sequential-term-search';
import { rankTermOptions } from '@src/utilities/term-ranking';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * The last answer of the host, and the text it is for.
 */
interface TermAnswer {
	/**
	 * The text the answer is for.
	 */
	text: string;

	/**
	 * The terms found.
	 */
	options: readonly ResourceOptionData[];
}

const NO_ANSWER: TermAnswer = { text: '', options: [] };

/**
 * The terms of the workspace a picker offers for the typed text, searched as it is typed while the
 * picker is in use. Until the host answers for the current text, the terms of its last answer that
 * match the text are shown, ranked as the host ranks them, so the list follows every keystroke at
 * once and the answer only adds to it.
 * @param targetType The type of terms, or `undefined` where the picker offers none.
 * @param text The typed text.
 * @param active Whether the picker is in use, as while its field has the focus.
 * @param statement The statement the terms are picked for, whose fitting terms come first.
 * @returns The terms, best first; none where the form editor offers no search.
 */
export function useTermOptions(targetType: TermSearchTargetType | undefined, text: string, active: boolean, statement?: TermSearchStatement): readonly ResourceOptionData[] {
	const { termSearch } = useFormEditorContext();
	const [answer, setAnswer] = useState<TermAnswer>(NO_ANSWER);
	const [search, setSearch] = useState<SequentialTermSearch>();
	// The statement is told by its key, so one made anew for the same statement keeps the search.
	const statementKey = statement ? `${termToString(statement.subject)} ${statement.predicate ?? ''}` : undefined;
	const statementRef = useRef(statement);

	statementRef.current = statement;

	// The search lives with the picker, and stops answering once the picker is gone or offers
	// another type of terms, or picks for another statement.
	useEffect(() => {
		setAnswer(NO_ANSWER);

		if (!termSearch || !targetType) {
			setSearch(undefined);

			return undefined;
		}

		const created = new SequentialTermSearch(termSearch, targetType, TERM_SEARCH_LIMIT, (answered, options) => setAnswer({ text: answered, options }), statementRef.current);

		setSearch(created);

		return () => created.dispose();
	}, [termSearch, targetType, statementKey]);

	useEffect(() => {
		if (active) {
			search?.request(text);
		}
	}, [search, text, active]);

	return useMemo(() => answer.text === text || !targetType ? answer.options : rankTermOptions(answer.options, text, targetType), [answer, text, targetType]);
}
