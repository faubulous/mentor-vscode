import { getLocalPartAndQuery } from '@src/utilities/uri';
import { ResourceOptionData, TermSource } from '../form-editor-model';

/**
 * What a term is matched and ranked by.
 */
export interface TermRankingKeys {
	/**
	 * The IRI of the term, whose local part is matched.
	 */
	iri: string;

	/**
	 * The label of the term.
	 */
	label: string;

	/**
	 * The prefixed name of the term, if it has one.
	 */
	prefixedName?: string;

	/**
	 * Where the term comes from.
	 */
	source: TermSource;
}

/**
 * A term that matches typed text, with what ranks it.
 */
interface TermMatch<T> {
	/**
	 * The term.
	 */
	term: T;

	/**
	 * What it is ranked by.
	 */
	keys: TermRankingKeys;

	/**
	 * How well it matches: `0` where a name starts with the text, `1` where a word of the label
	 * does, `2` where a name contains it.
	 */
	quality: number;
}

/**
 * The rank of each source: the document first, then the vocabularies it declares, then the rest.
 */
const SOURCE_RANK: Record<TermSource, number> = { document: 0, declared: 1, workspace: 2 };

/**
 * Compares labels and IRIs, made once, as it is far faster than comparing strings one by one.
 */
const COLLATOR = new Intl.Collator();

/**
 * The terms that match typed text, ranked: by source, then by how well they match, then by label
 * and IRI. The host ranks the terms of a search by it, and a picker the terms of its last answer
 * while the next is on its way, so both agree on the terms shown and their order.
 * @param terms The terms.
 * @param text The typed text; empty matches every term.
 * @param keysOf What a term is matched and ranked by.
 * @returns The matching terms, best first.
 */
export function rankTerms<T>(terms: Iterable<T>, text: string, keysOf: (term: T) => TermRankingKeys): T[] {
	const needle = text.trim().toLowerCase();
	const matches: TermMatch<T>[] = [];

	for (const term of terms) {
		const keys = keysOf(term);
		const quality = _matchQuality(needle, keys);

		if (quality >= 0) {
			matches.push({ term, keys, quality });
		}
	}

	return matches.sort(_compareMatches).map(match => match.term);
}

/**
 * The options of a search that match typed text, ranked as {@link rankTerms} ranks terms, as a
 * picker narrows its last answer by.
 * @param options The options.
 * @param text The typed text; empty matches every option.
 * @returns The matching options, best first.
 */
export function rankTermOptions(options: Iterable<ResourceOptionData>, text: string): ResourceOptionData[] {
	return rankTerms(options, text, option => ({ iri: option.subject.value, label: option.label, prefixedName: option.prefixedName, source: option.source }));
}

/**
 * The items that match typed text, as a picker matches what it offers besides terms: those whose
 * name starts with the text first, then those with a word of the label that does, then those with
 * a name that contains it, each in the order given.
 * @param items The items, in the order they are offered in.
 * @param text The typed text; empty matches every item.
 * @param namesOf The names an item is matched by, its label first.
 * @returns The matching items, best first.
 */
export function narrowByMatch<T>(items: Iterable<T>, text: string, namesOf: (item: T) => readonly (string | undefined)[]): T[] {
	const needle = text.trim().toLowerCase();
	const matches: { item: T; quality: number }[] = [];

	for (const item of items) {
		const quality = _qualityOfNames(needle, namesOf(item));

		if (quality >= 0) {
			matches.push({ item, quality });
		}
	}

	return matches.sort((a, b) => a.quality - b.quality).map(match => match.item);
}

/**
 * How well a term matches typed text, by its label, the local part of its IRI and its prefixed
 * name.
 * @param needle The typed text, trimmed and in lower case; empty matches every term.
 * @param keys What the term is matched by.
 * @returns The quality, as {@link _qualityOfNames} tells it.
 */
function _matchQuality(needle: string, keys: TermRankingKeys): number {
	return _qualityOfNames(needle, [keys.label, getLocalPartAndQuery(keys.iri), keys.prefixedName]);
}

/**
 * How well names match typed text.
 * @param needle The typed text, trimmed and in lower case; empty matches any names.
 * @param names The names, the label first, whose words are matched too.
 * @returns `0` where a name starts with the text, `1` where a word of the label does, `2` where a
 * name contains it, `-1` where none matches.
 */
function _qualityOfNames(needle: string, names: readonly (string | undefined)[]): number {
	if (needle === '') {
		return 0;
	}

	const lowered = names.map(name => (name ?? '').toLowerCase());

	if (lowered.some(name => name.startsWith(needle))) {
		return 0;
	}

	if ((lowered[0] ?? '').split(/[\s_\-/]+/).some(word => word.startsWith(needle))) {
		return 1;
	}

	return lowered.some(name => name.includes(needle)) ? 2 : -1;
}

/**
 * Order matches: by source, then by how well they match, then by label and IRI.
 * @param a A match.
 * @param b Another match.
 * @returns A negative number when `a` comes first, a positive one when `b` does.
 */
function _compareMatches<T>(a: TermMatch<T>, b: TermMatch<T>): number {
	return SOURCE_RANK[a.keys.source] - SOURCE_RANK[b.keys.source]
		|| a.quality - b.quality
		|| COLLATOR.compare(a.keys.label, b.keys.label)
		|| COLLATOR.compare(a.keys.iri, b.keys.iri);
}
