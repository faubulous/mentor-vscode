import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { MARKDOWN_DATATYPE } from '../services/statement/literal-datatypes';

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
