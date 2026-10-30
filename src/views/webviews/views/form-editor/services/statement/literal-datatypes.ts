import { TermRef } from '../../form-editor-model';
import { XSD_NAMESPACE } from './well-known-iris';

/**
 * A datatype the literal fields know: its IRI and the text it takes.
 */
interface LiteralDatatype {
	/**
	 * The IRI of the datatype.
	 */
	iri: string;

	/**
	 * The text the datatype takes; any text when absent.
	 */
	pattern?: RegExp;
}

/**
 * A number with an optional exponent, infinity or not-a-number, as doubles and floats are written.
 */
const FLOATING_POINT = /^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?|[+-]?INF|NaN)$/;

/**
 * The IRI of the Markdown media type, which text literals in Markdown are typed with.
 */
export const MARKDOWN_DATATYPE = 'https://www.iana.org/assignments/media-types/text/markdown';

/**
 * The datatypes the literal fields know, in the order the picker offers them.
 */
const KNOWN: readonly LiteralDatatype[] = [
	{ iri: `${XSD_NAMESPACE}string` },
	{ iri: `${XSD_NAMESPACE}integer`, pattern: /^[+-]?\d+$/ },
	{ iri: `${XSD_NAMESPACE}decimal`, pattern: /^[+-]?(\d+(\.\d*)?|\.\d+)$/ },
	{ iri: `${XSD_NAMESPACE}double`, pattern: FLOATING_POINT },
	{ iri: `${XSD_NAMESPACE}float`, pattern: FLOATING_POINT },
	{ iri: `${XSD_NAMESPACE}boolean`, pattern: /^(true|false|1|0)$/ },
	{ iri: `${XSD_NAMESPACE}anyURI`, pattern: /^[a-zA-Z][\w+.-]*:\S*$/ },
	{ iri: MARKDOWN_DATATYPE }
];

/**
 * The datatypes whose values are numbers, written in the editor font and stepped with the arrows.
 */
const NUMERIC: ReadonlySet<string> = new Set(['integer', 'decimal', 'double', 'float'].map(name => `${XSD_NAMESPACE}${name}`));

/**
 * What the literal fields know about datatypes: which of them are numbers, which text each takes,
 * and which of them a text fits. How they are named is the components' to say.
 */
export class LiteralDatatypes {
	/**
	 * Indicate whether the values of a datatype are numbers.
	 * @param iri The IRI of the datatype.
	 * @returns `true` for a numeric datatype.
	 */
	static isNumeric(iri: string): boolean {
		return NUMERIC.has(iri);
	}

	/**
	 * Indicate whether a text is a value of a datatype. A datatype the fields do not know takes
	 * any text.
	 * @param iri The IRI of the datatype.
	 * @param text The text.
	 * @returns `true` when the text fits.
	 */
	static fits(iri: string, text: string): boolean {
		const pattern = KNOWN.find(datatype => datatype.iri === iri)?.pattern;

		return !pattern || pattern.test(text);
	}

	/**
	 * The datatypes a text fits, in the order the picker offers them.
	 * @param text The text.
	 * @returns The IRIs of the datatypes.
	 */
	static fitting(text: string): string[] {
		return KNOWN.filter(datatype => !datatype.pattern || datatype.pattern.test(text)).map(datatype => datatype.iri);
	}

	/**
	 * Indicate whether a term fits its datatype: a literal whose text its datatype takes, or a
	 * term that is no typed literal.
	 * @param term The term.
	 * @returns `true` when the term fits.
	 */
	static fitsTerm(term: TermRef): boolean {
		return term.kind !== 'literal' || !term.datatype || LiteralDatatypes.fits(term.datatype, term.value);
	}
}
