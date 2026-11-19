import { _RDF, RDF, XSD } from '@faubulous/mentor-rdf/ontologies';
import { LanguageTags } from '@src/utilities/language-tags';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { ResourceOptionData } from '../form-editor-model';
import { narrowByMatch } from '../services/term-ranking';
import { LiteralTag } from '../state/literal-tag';
import { PrefixProposal } from '../state/prefix-proposal';
import { getDatatypeFormat, getDatatypeName } from './datatype-labels';

/**
 * The tabs of the tag picker.
 */
export type TagPickerTab = 'datatype' | 'language';

/**
 * What picking an item of the tag picker gives a literal: its tag, and the prefix to declare for
 * the datatype, if any.
 */
export interface TagChoice {
	/**
	 * The tag: a language, a datatype, or neither for a plain string.
	 */
	tag: LiteralTag;

	/**
	 * The prefix to declare for the datatype, where the document declares none for its namespace.
	 */
	missingPrefix?: PrefixProposal;
}

/**
 * An item of the tag picker: its code, what it is, and what picking it gives.
 */
export interface TagPickerItemData {
	/**
	 * Identifies the item among the items of its tab.
	 */
	key: string;

	/**
	 * The code: the name of a datatype or a language tag.
	 */
	code: string;

	/**
	 * What the item is: the format of a datatype, or the name of a language.
	 */
	description: string;

	/**
	 * The names the filter of the picker is matched against, the code first.
	 */
	names: readonly (string | undefined)[];

	/**
	 * What picking the item gives the literal.
	 */
	choice: TagChoice;
}

/**
 * What the item of a language tag typed into the filter, which the picker does not list, says.
 */
const FREE_TAG_DESCRIPTION = 'Use this tag';

/**
 * The datatypes the literal fields offer themselves, in the order they are offered.
 */
const OFFERED_DATATYPES: readonly string[] = [XSD.string, XSD.boolean, XSD.integer, XSD.decimal, XSD.double, XSD.date, XSD.dateTime, XSD.anyURI];

/**
 * The datatypes of the workspace no literal of the picker takes, as they need a language.
 */
const LANGUAGE_DATATYPES: ReadonlySet<string> = new Set([RDF.langString, `${_RDF}dirLangString`]);

/**
 * The datatypes the tag picker offers: those the literal fields offer themselves, string first, then the
 * other datatypes of the workspace, as the host ranked them.
 * @param storeDatatypes The datatypes of the workspace.
 * @returns The items.
 */
export function getDatatypeItems(storeDatatypes: readonly ResourceOptionData[]): TagPickerItemData[] {
	const known = OFFERED_DATATYPES.map(iri => {
		const code = getDatatypeName(RdfDataFactory.namedNode(iri), () => undefined);

		return { key: _datatypeKeyOf(iri), code, description: getDatatypeFormat(iri) ?? '', names: [code], choice: { tag: iri === XSD.string ? {} : { datatype: iri } } };
	});

	const others = storeDatatypes
		.filter(option => !OFFERED_DATATYPES.includes(option.subject.value) && !LANGUAGE_DATATYPES.has(option.subject.value))
		.map(option => {
			const code = getDatatypeName(option.subject, () => option.prefixedName);

			return {
				key: _datatypeKeyOf(option.subject.value),
				code,
				description: option.missingPrefix ? `${option.label} · adds ${option.missingPrefix.prefix}:` : option.label,
				names: [code, option.label, getLocalPartAndQuery(option.subject.value)],
				choice: { tag: { datatype: option.subject.value }, missingPrefix: option.missingPrefix }
			};
		});

	return [...known, ...others];
}

/**
 * The languages the tag picker offers: those in use first, the languages of the card before those
 * of the workspace, then the other common languages by their names; each once, in standard form.
 * @param usedLanguages The language tags in use, the most used first.
 * @returns The items.
 */
export function getLanguageItems(usedLanguages: readonly string[]): TagPickerItemData[] {
	const items: TagPickerItemData[] = [];
	const seen = new Set<string>();

	for (const language of [...usedLanguages, ...LanguageTags.common()]) {
		const tag = LanguageTags.normalize(language);
		const key = _languageKeyOf(tag);

		if (!seen.has(key)) {
			seen.add(key);
			const name = LanguageTags.nameOf(tag);

			items.push({ key, code: tag, description: name ?? 'Language', names: [tag, name], choice: { tag: { language: tag } } });
		}
	}

	return items;
}

/**
 * The items of a tab that match the text typed into the filter of the picker, best first, as every
 * picker matches. On the Language tab a well-formed language tag no item has is offered last, in
 * standard form, to be used as it is; not an alias such as `ger`, whose tag `de` is listed.
 * @param items The items of the tab.
 * @param filter The text typed into the filter.
 * @param tab The tab.
 * @returns The items that match.
 */
export function filterTagPickerItems(items: readonly TagPickerItemData[], filter: string, tab: TagPickerTab): TagPickerItemData[] {
	const matches = narrowByMatch(items, filter, item => item.names);
	const typed = filter.trim();

	if (tab !== 'language' || !LanguageTags.isWellFormed(typed) || LanguageTags.isAlias(typed) || items.some(item => item.key === _languageKeyOf(typed))) {
		return matches;
	}

	const tag = LanguageTags.normalize(typed);

	return [...matches, { key: _languageKeyOf(tag), code: tag, description: FREE_TAG_DESCRIPTION, names: [tag], choice: { tag: { language: tag } } }];
}

/**
 * The key of the item that stands for a tag: the item of its language or of its datatype, and
 * that of string for a plain string.
 * @param tag The tag.
 * @returns The key.
 */
export function getTagItemKey(tag: LiteralTag): string {
	return tag.language ? _languageKeyOf(tag.language) : _datatypeKeyOf(tag.datatype ?? XSD.string);
}

/**
 * The key of the item of a datatype.
 * @param iri The IRI of the datatype.
 * @returns The key.
 */
function _datatypeKeyOf(iri: string): string {
	return `datatype:${iri}`;
}

/**
 * The key of the item of a language, the same for every spelling of its tag.
 * @param tag The language tag.
 * @returns The key.
 */
function _languageKeyOf(tag: string): string {
	return `language:${tag.toLowerCase()}`;
}
