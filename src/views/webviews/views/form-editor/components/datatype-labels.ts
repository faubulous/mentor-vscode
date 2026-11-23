import { Literal, NamedNode } from '@rdfjs/types';
import { _XSD, XSD } from '@faubulous/mentor-rdf/ontologies';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { NamespaceData } from '../form-editor-model';
import { LanguageTags } from '@src/utilities/language-tags';

/**
 * Gives a datatype its prefixed name, where one is declared for its namespace.
 */
export type PrefixedNameOf = (datatype: NamedNode) => string | undefined;

/**
 * The annotation of a literal, as its field shows it after the text.
 */
export interface LiteralAnnotationData {
	/**
	 * The text of the tag: the language tag, or the name of the datatype.
	 */
	text: string;

	/**
	 * The tooltip of the annotation: the IRI of the datatype, or the name of the language.
	 */
	tooltip: string;

	/**
	 * The accessible name of the annotation, which changes it.
	 */
	accessibleName: string;
}

/**
 * The text a value of a datatype is written as, by example, shown in an empty value and in the
 * message for a text that does not fit.
 */
const DATATYPE_FORMATS: ReadonlyMap<string, string> = new Map([
	[XSD.string, 'Text'],
	[XSD.boolean, 'true or false'],
	[XSD.integer, '42'],
	[XSD.int, '42'],
	[XSD.long, '42'],
	[XSD.short, '42'],
	[XSD.nonNegativeInteger, '42'],
	[XSD.positiveInteger, '42'],
	[XSD.decimal, '3.14'],
	[XSD.double, '1.5E3'],
	[XSD.float, '1.5E3'],
	[XSD.date, 'YYYY-MM-DD'],
	[XSD.dateTime, 'YYYY-MM-DDThh:mm:ss'],
	[XSD.time, 'hh:mm:ss'],
	[XSD.gYear, 'YYYY'],
	[XSD.gYearMonth, 'YYYY-MM'],
	[XSD.anyURI, 'https://…']
]);

/**
 * The name of a datatype in a literal field: the local name of an XSD datatype, as `date`, and the
 * prefixed name of any other, as `geo:wktLiteral`, or its local name where no prefix is declared.
 * @param datatype The datatype.
 * @param prefixedNameOf Gives the datatype its prefixed name.
 * @returns The name.
 */
export function getDatatypeName(datatype: NamedNode, prefixedNameOf: PrefixedNameOf): string {
	if (datatype.value.startsWith(_XSD)) {
		return datatype.value.slice(_XSD.length);
	}

	return prefixedNameOf(datatype) ?? getLocalPartAndQuery(datatype.value);
}

/**
 * Give datatypes their prefixed names by the namespaces a document declares.
 * @param namespaces The namespace declarations of the document.
 * @returns Gives a datatype its prefixed name.
 */
export function getPrefixedNameIn(namespaces: readonly NamespaceData[]): PrefixedNameOf {
	return datatype => {
		const namespace = namespaces.find(candidate => datatype.value.startsWith(candidate.iri));

		return namespace ? `${namespace.prefix}:${datatype.value.slice(namespace.iri.length)}` : undefined;
	};
}

/**
 * The text a value of a datatype is written as, by example, such as `YYYY-MM-DD` for a date.
 * @param iri The IRI of the datatype.
 * @returns The format, or `undefined` for a datatype without one.
 */
export function getDatatypeFormat(iri: string): string | undefined {
	return DATATYPE_FORMATS.get(iri);
}

/**
 * Why a text does not fit a datatype, with the text it expects where there is one.
 * @param name The name of the datatype.
 * @param iri The IRI of the datatype.
 * @returns The message.
 */
export function getDatatypeProblem(name: string, iri: string): string {
	const format = getDatatypeFormat(iri);

	return format ? `Not a valid ${name} — expected ${format}` : `Not a valid ${name}`;
}

/**
 * The annotation of a literal as text: its language tag in standard form, with its direction, else
 * the name of its datatype; none for a plain string.
 * @param term The literal.
 * @param prefixedNameOf Gives a datatype its prefixed name.
 * @returns The annotation, or `undefined` for a plain string.
 */
export function getLiteralAnnotation(term: Literal, prefixedNameOf: PrefixedNameOf): string | undefined {
	if (term.language) {
		const languageTag = LanguageTags.normalize(term.language);

		return term.direction ? `${languageTag}--${term.direction}` : languageTag;
	}

	return term.datatype.value === XSD.string ? undefined : getDatatypeName(term.datatype, prefixedNameOf);
}

/**
 * The annotation a literal field shows after its text, with the name of its language or the IRI of
 * its datatype as its tooltip; none for a plain string.
 * @param term The literal.
 * @param prefixedNameOf Gives a datatype its prefixed name.
 * @returns The annotation, or `undefined` for a plain string.
 */
export function getLiteralAnnotationData(term: Literal, prefixedNameOf: PrefixedNameOf): LiteralAnnotationData | undefined {
	const text = getLiteralAnnotation(term, prefixedNameOf);

	if (!text) {
		return undefined;
	}

	if (term.language) {
		const name = LanguageTags.nameOf(term.language);

		return { text, tooltip: name ? `Language: ${name}` : 'Language', accessibleName: `Language ${text}, change` };
	}

	return { text, tooltip: term.datatype.value, accessibleName: `Datatype ${text}, change` };
}

/**
 * The annotation a plain string shows for the datatype its text looks like a value of, which Tab or
 * a click gives it: the name of the datatype with a question mark.
 * @param datatype The suggested datatype.
 * @param prefixedNameOf Gives a datatype its prefixed name.
 * @returns The annotation.
 */
export function getSuggestedAnnotationData(datatype: NamedNode, prefixedNameOf: PrefixedNameOf): LiteralAnnotationData {
	const name = getDatatypeName(datatype, prefixedNameOf);

	return { text: `${name}?`, tooltip: `Make it a ${name} (Tab)`, accessibleName: `Suggested datatype ${name}, accept` };
}
