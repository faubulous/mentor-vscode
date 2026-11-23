import { useEffect, useMemo, useState } from 'react';
import { ResourceOptionData, TermSearchTargetType } from '../form-editor-model';
import { SequentialTermSearch } from '../services/sequential-term-search';
import { rankTermOptions } from '../services/term-ranking';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * How many terms a picker asks for.
 */
const TERM_SEARCH_LIMIT = 50;

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
 * @returns The terms, best first; none where the form editor offers no search.
 */
export function useTermOptions(targetType: TermSearchTargetType | undefined, text: string, active: boolean): readonly ResourceOptionData[] {
	const { termSearch } = useFormEditorContext();
	const [answer, setAnswer] = useState<TermAnswer>(NO_ANSWER);
	const [search, setSearch] = useState<SequentialTermSearch>();

	// The search lives with the picker, and stops answering once the picker is gone or offers
	// another type of terms.
	useEffect(() => {
		setAnswer(NO_ANSWER);

		if (!termSearch || !targetType) {
			setSearch(undefined);

			return undefined;
		}

		const created = new SequentialTermSearch(termSearch, targetType, TERM_SEARCH_LIMIT, (answered, options) => setAnswer({ text: answered, options }));

		setSearch(created);

		return () => created.dispose();
	}, [termSearch, targetType]);

	useEffect(() => {
		if (active) {
			search?.request(text);
		}
	}, [search, text, active]);

	return useMemo(() => answer.text === text ? answer.options : rankTermOptions(answer.options, text), [answer, text]);
}
