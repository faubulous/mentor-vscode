import { Literal, NamedNode } from '@rdfjs/types';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { NamespaceInfo } from '../form-editor-model';
import { MARKDOWN_DATATYPE } from '../services/statement/literal-datatypes';
import { getLanguageTagLabel } from './term-labels';

/**
 * How a datatype is named in the literal fields, and what to type when a text does not fit it.
 */
interface DatatypeText {
	/**
	 * The label shown in the field.
	 */
	label: string;

	/**
	 * What to type instead, shown when the text does not fit.
	 */
	hint?: string;
}

/**
 * The names of the datatypes the literal fields know, by IRI.
 */
const DATATYPE_TEXTS: ReadonlyMap<string, DatatypeText> = new Map([
	[XSD.string, { label: 'Text' }],
	[XSD.integer, { label: 'Integer', hint: 'Whole numbers only, e.g. 1 or -2' }],
	[XSD.decimal, { label: 'Decimal', hint: 'A decimal number, e.g. 3600.0' }],
	[XSD.double, { label: 'Double', hint: 'A double, e.g. 3.6E3' }],
	[XSD.float, { label: 'Float', hint: 'A float, e.g. 3.6E3' }],
	[XSD.boolean, { label: 'Boolean', hint: 'true or false' }],
	[XSD.anyURI, { label: 'URI', hint: 'A URI, e.g. https://…' }],
	[MARKDOWN_DATATYPE, { label: 'Markdown' }]
]);

/**
 * The label of a datatype the literal fields know.
 * @param iri The IRI of the datatype.
 * @returns The label, or `undefined` for a datatype the fields do not know.
 */
export function getDatatypeLabel(iri: string): string | undefined {
	return DATATYPE_TEXTS.get(iri)?.label;
}

/**
 * What to type when a text does not fit a datatype.
 * @param iri The IRI of the datatype.
 * @returns The hint.
 */
export function getDatatypeHint(iri: string): string {
	return DATATYPE_TEXTS.get(iri)?.hint ?? `The text is no value of ${getDatatypeLabel(iri) ?? iri}.`;
}

/**
 * The tag of a literal in its field: its language, else the label of its datatype the fields know,
 * else the prefixed name of the datatype, else its IRI; Text for plain text.
 * @param term The literal.
 * @param languageTags The spellings of the language tags of the document.
 * @param prefixedNameOf Gives a datatype its prefixed name, where it has one.
 * @returns The tag.
 */
export function getLiteralFieldTag(term: Literal, languageTags: Readonly<Record<string, string>>, prefixedNameOf: (datatype: NamedNode) => string | undefined): string {
	return getLanguageTagLabel(term, languageTags) ?? getDatatypeLabel(term.datatype.value) ?? prefixedNameOf(term.datatype) ?? term.datatype.value;
}

/**
 * The tag of a literal that is read: its language, else its datatype by its prefixed name, or its
 * local name where no prefix is declared; none for a plain string.
 * @param term The literal.
 * @param languageTags The spellings of the language tags of the document.
 * @param namespaces The namespace declarations of the document.
 * @returns The tag, or `undefined` for a plain string.
 */
export function getLiteralTag(term: Literal, languageTags: Readonly<Record<string, string>>, namespaces: readonly NamespaceInfo[]): string | undefined {
	const language = getLanguageTagLabel(term, languageTags);
	const datatype = term.datatype.value;

	if (language || datatype === XSD.string) {
		return language;
	}

	const namespace = namespaces.find(candidate => datatype.startsWith(candidate.iri));

	return namespace ? `${namespace.prefix}:${datatype.slice(namespace.iri.length)}` : getLocalPartAndQuery(datatype);
}
