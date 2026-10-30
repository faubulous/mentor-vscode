import { TermRef } from '../../form-editor-model';
import { XSD_NAMESPACE } from './well-known-iris';

/**
 * A datatype the literal fields know: how it is labelled and what text it takes.
 */
export interface LiteralDatatype {
	/**
	 * The IRI of the datatype.
	 */
	iri: string;

	/**
	 * The label shown in the field.
	 */
	label: string;

	/**
	 * The text the datatype takes; any text when absent.
	 */
	pattern?: RegExp;

	/**
	 * What to type instead, shown when the text does not fit.
	 */
	hint?: string;
}

/**
 * A number with an optional exponent, infinity or not-a-number, as doubles and floats are written.
 */
const FLOATING_POINT = /^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?|[+-]?INF|NaN)$/;

/**
 * The IRI of the Markdown media type, which text literals in Markdown are typed with.
 */
const MARKDOWN_DATATYPE = 'https://www.iana.org/assignments/media-types/text/markdown';

/**
 * The datatypes the literal fields know, in the order the picker offers them.
 */
const KNOWN: readonly LiteralDatatype[] = [
	{ iri: `${XSD_NAMESPACE}string`, label: 'Text' },
	{ iri: `${XSD_NAMESPACE}integer`, label: 'Integer', pattern: /^[+-]?\d+$/, hint: 'Whole numbers only, e.g. 1 or -2' },
	{ iri: `${XSD_NAMESPACE}decimal`, label: 'Decimal', pattern: /^[+-]?(\d+(\.\d*)?|\.\d+)$/, hint: 'A decimal number, e.g. 3600.0' },
	{ iri: `${XSD_NAMESPACE}double`, label: 'Double', pattern: FLOATING_POINT, hint: 'A double, e.g. 3.6E3' },
	{ iri: `${XSD_NAMESPACE}float`, label: 'Float', pattern: FLOATING_POINT, hint: 'A float, e.g. 3.6E3' },
	{ iri: `${XSD_NAMESPACE}boolean`, label: 'Boolean', pattern: /^(true|false|1|0)$/, hint: 'true or false' },
	{ iri: `${XSD_NAMESPACE}anyURI`, label: 'URI', pattern: /^[a-zA-Z][\w+.-]*:\S*$/, hint: 'A URI, e.g. https://…' },
	{ iri: MARKDOWN_DATATYPE, label: 'Markdown' }
];

/**
 * The datatypes whose values are numbers, written in the editor font and stepped with the arrows.
 */
const NUMERIC: ReadonlySet<string> = new Set(['integer', 'decimal', 'double', 'float'].map(name => `${XSD_NAMESPACE}${name}`));

/**
 * What the literal fields know about datatypes: their labels, which of them are numbers, which
 * text each takes, and which of them a text fits.
 */
export class LiteralDatatypes {
	/**
	 * Look a datatype up.
	 * @param iri The IRI of the datatype.
	 * @returns The datatype, or `undefined` for one the fields do not know.
	 */
	static of(iri: string): LiteralDatatype | undefined {
		return KNOWN.find(datatype => datatype.iri === iri);
	}

	/**
	 * Indicate whether the values of a datatype are numbers.
	 * @param iri The IRI of the datatype.
	 * @returns `true` for a numeric datatype.
	 */
	static isNumeric(iri: string): boolean {
		return NUMERIC.has(iri);
	}

	/**
	 * Tell what keeps a text from being a value of a datatype.
	 * @param iri The IRI of the datatype.
	 * @param text The text.
	 * @returns The hint, or `undefined` when the text fits.
	 */
	static problemOf(iri: string, text: string): string | undefined {
		const datatype = LiteralDatatypes.of(iri);

		return datatype?.pattern && !datatype.pattern.test(text) ? datatype.hint : undefined;
	}

	/**
	 * The datatypes a text fits, in the order the picker offers them.
	 * @param text The text.
	 * @returns The datatypes.
	 */
	static fitting(text: string): LiteralDatatype[] {
		return KNOWN.filter(datatype => !datatype.pattern || datatype.pattern.test(text));
	}

	/**
	 * Tell what keeps a literal from being a value of its datatype.
	 * @param term The term.
	 * @returns The hint, or `undefined` for a literal that fits or a term that is no literal.
	 */
	static problemOfTerm(term: TermRef): string | undefined {
		return term.kind === 'literal' && term.datatype ? LiteralDatatypes.problemOf(term.datatype, term.value) : undefined;
	}
}
