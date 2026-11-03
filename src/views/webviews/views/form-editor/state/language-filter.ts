import { Term } from '@rdfjs/types';
import { RowValue } from './row-value';

/**
 * Which literal values the rows of the form show: those of one language, or all of them. A value
 * without a language tag, and a value that is no literal, is always shown. A row of a predicate
 * whose literals carry language tags, none of them in the language shown, offers an empty field for
 * it, which a value typed into it fills.
 */
export class LanguageFilter {
	/**
	 * The filter that shows the values of every language.
	 */
	static readonly ALL = new LanguageFilter(undefined);

	/**
	 * Create a filter.
	 * @param language The language tag whose values are shown, in lower case; every language when
	 * `undefined`.
	 */
	constructor(readonly language: string | undefined) { }

	/**
	 * Indicate whether a term is shown.
	 * @param term The term.
	 * @returns `true` unless it is a literal in another language.
	 */
	shows(term: Term): boolean {
		return this.language === undefined || term.termType !== 'Literal' || !term.language || term.language === this.language;
	}

	/**
	 * Indicate whether the values of a row lack the language shown: some carry a language tag, and
	 * none carries the one shown.
	 * @param values The values of the row.
	 * @returns `true` when the row offers an empty field for the language.
	 */
	lacksLanguage(values: readonly RowValue[]): boolean {
		if (this.language === undefined) {
			return false;
		}

		const languages = values.flatMap(value => {
			const term = _termOf(value);

			return term.termType === 'Literal' && term.language ? [term.language] : [];
		});

		return languages.length > 0 && !languages.includes(this.language);
	}

	/**
	 * The value typed into the empty field of the language shown: the only value of the language,
	 * when it is new and the row lacks the language without it. Emptying it gives the empty field
	 * back.
	 * @param values The values of the row.
	 * @returns The index of the value, or `undefined` when the row has none.
	 */
	filledIndex(values: readonly RowValue[]): number | undefined {
		if (this.language === undefined) {
			return undefined;
		}

		const indexes = values.flatMap((value, index) => {
			const term = _termOf(value);

			return term.termType === 'Literal' && term.language === this.language ? [index] : [];
		});

		if (indexes.length !== 1) {
			return undefined;
		}

		const index = indexes[0];
		const value = values[index];
		const isNew = value.kind === 'term' && value.replaces === undefined;

		return isNew && this.lacksLanguage(values.filter((_, position) => position !== index)) ? index : undefined;
	}
}

/**
 * The term a value stands for.
 * @param value The value.
 * @returns The term.
 */
function _termOf(value: RowValue): Term {
	return value.kind === 'written' ? value.view.term : value.term;
}
