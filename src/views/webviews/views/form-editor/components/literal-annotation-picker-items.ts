import { _RDF, RDF, XSD } from '@faubulous/mentor-rdf/ontologies';
import { LanguageTags } from '@src/utilities/language-tags';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { ResourceOptionData } from '../form-editor-model';
import { narrowByMatch } from '../services/term-ranking';
import { LiteralAnnotation } from '../state/literal-annotation';
import { PrefixProposal } from '../state/prefix-proposal';
import { getDatatypeFormat, getDatatypeName } from './datatype-labels';

/**
 * The tabs of the annotation picker.
 */
export type LiteralAnnotationPickerTab = 'datatype' | 'language';

/**
 * What picking an item of the annotation picker gives a literal: its annotation, and the prefix to declare for
 * the datatype, if any.
 */
export interface LiteralAnnotationSelection {
	/**
	 * Tells the selection of an annotation from the selection of a resource.
	 */
	type: 'literal';

	/**
	 * The annotation: a language, a datatype, or neither for a plain string.
	 */
	annotation: LiteralAnnotation;

	/**
	 * The prefix to declare for the datatype, where the document declares none for its namespace.
	 */
	missingPrefix?: PrefixProposal;
}

/**
 * What picking an item of the annotation picker gives a value: an annotation for a literal, or a resource
 * instead of a literal.
 */
export type LiteralAnnotationPickerSelection = LiteralAnnotationSelection | { type: 'resource' };

/**
 * The position of the item that makes a value a resource in the Datatype tab: first for the text
 * typed for a new value, after the datatypes the literal fields offer for a literal.
 */
export type ResourceItemPosition = 'first' | 'last';

/**
 * An item of the annotation picker: its code, what it is, and what picking it gives.
 */
export interface LiteralAnnotationPickerItemData {
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
	selection: LiteralAnnotationPickerSelection;
}

/**
 * What the item of a language tag typed into the filter, which the picker does not list, says.
 */
const FREE_TAG_DESCRIPTION = 'Use this tag';

/**
 * The key of the item that makes a value a resource.
 */
const RESOURCE_KEY = 'resource';

/**
 * The item that makes a value a resource, named by what its text is then read as.
 */
const RESOURCE_ITEM: LiteralAnnotationPickerItemData = { key: RESOURCE_KEY, code: 'resource', description: 'IRI', names: ['resource', 'IRI'], selection: { type: 'resource' } };

/**
 * The datatypes the literal fields offer themselves, in the order they are offered.
 */
const OFFERED_DATATYPES: readonly string[] = [XSD.string, XSD.boolean, XSD.integer, XSD.decimal, XSD.double, XSD.date, XSD.dateTime, XSD.anyURI];

/**
 * The datatypes of the workspace no literal of the picker takes, as they need a language.
 */
const LANGUAGE_DATATYPES: ReadonlySet<string> = new Set([RDF.langString, `${_RDF}dirLangString`]);

/**
 * The datatypes the annotation picker offers: those the literal fields offer themselves, string first, then the
 * other datatypes of the workspace, as the host ranked them. Where a value may be a resource, the
 * resource item stands first or after the datatypes of the literal fields.
 * @param storeDatatypes The datatypes of the workspace.
 * @param resourceItemPosition The position of the resource item, if it is offered.
 * @returns The items.
 */
export function getDatatypeItems(storeDatatypes: readonly ResourceOptionData[], resourceItemPosition?: ResourceItemPosition): LiteralAnnotationPickerItemData[] {
	const known: LiteralAnnotationPickerItemData[] = OFFERED_DATATYPES.map(iri => {
		const code = getDatatypeName(RdfDataFactory.namedNode(iri), () => undefined);

		return { key: _datatypeKeyOf(iri), code, description: getDatatypeFormat(iri) ?? '', names: [code], selection: { type: 'literal', annotation: iri === XSD.string ? {} : { datatype: iri } } };
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
				selection: { type: 'literal', annotation: { datatype: option.subject.value }, missingPrefix: option.missingPrefix }
			} satisfies LiteralAnnotationPickerItemData;
		});

	if (resourceItemPosition === 'first') {
		return [RESOURCE_ITEM, ...known, ...others];
	}

	return resourceItemPosition === 'last' ? [...known, RESOURCE_ITEM, ...others] : [...known, ...others];
}

/**
 * The languages the annotation picker offers: those in use first, the languages of the card before those
 * of the workspace, then the other common languages by their names; each once, in standard form.
 * @param usedLanguages The language tags in use, the most used first.
 * @returns The items.
 */
export function getLanguageItems(usedLanguages: readonly string[]): LiteralAnnotationPickerItemData[] {
	const items: LiteralAnnotationPickerItemData[] = [];
	const seen = new Set<string>();

	for (const language of [...usedLanguages, ...LanguageTags.common()]) {
		const languageTag = LanguageTags.normalize(language);
		const key = _languageKeyOf(languageTag);

		if (!seen.has(key)) {
			seen.add(key);
			const name = LanguageTags.nameOf(languageTag);

			items.push({ key, code: languageTag, description: name ?? 'Language', names: [languageTag, name], selection: { type: 'literal', annotation: { language: languageTag } } });
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
export function filterLiteralAnnotationPickerItems(items: readonly LiteralAnnotationPickerItemData[], filter: string, tab: LiteralAnnotationPickerTab): LiteralAnnotationPickerItemData[] {
	const matches = narrowByMatch(items, filter, item => item.names);
	const typed = filter.trim();

	if (tab !== 'language' || !LanguageTags.isWellFormed(typed) || LanguageTags.isAlias(typed) || items.some(item => item.key === _languageKeyOf(typed))) {
		return matches;
	}

	const languageTag = LanguageTags.normalize(typed);

	return [...matches, { key: _languageKeyOf(languageTag), code: languageTag, description: FREE_TAG_DESCRIPTION, names: [languageTag], selection: { type: 'literal', annotation: { language: languageTag } } }];
}

/**
 * The key of the item that stands for an annotation: the item of its language or of its datatype, and
 * that of string for a plain string; the resource item for a value that is to be a resource.
 * @param annotation The annotation, or `resource`.
 * @returns The key.
 */
export function getLiteralAnnotationItemKey(annotation: LiteralAnnotation | 'resource'): string {
	if (annotation === 'resource') {
		return RESOURCE_KEY;
	}

	return annotation.language ? _languageKeyOf(annotation.language) : _datatypeKeyOf(annotation.datatype ?? XSD.string);
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
 * @param languageTag The language tag.
 * @returns The key.
 */
function _languageKeyOf(languageTag: string): string {
	return `language:${languageTag.toLowerCase()}`;
}
