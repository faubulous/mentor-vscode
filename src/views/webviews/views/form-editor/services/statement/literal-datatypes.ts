import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { TermRef } from '../../form-editor-model';

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
 * The datatypes the literal fields know.
 */
const KNOWN: readonly LiteralDatatype[] = [
	{ iri: XSD.string },
	{ iri: XSD.integer, pattern: /^[+-]?\d+$/ },
	{ iri: XSD.decimal, pattern: /^[+-]?(\d+(\.\d*)?|\.\d+)$/ },
	{ iri: XSD.double, pattern: FLOATING_POINT },
	{ iri: XSD.float, pattern: FLOATING_POINT },
	{ iri: XSD.boolean, pattern: /^(true|false|1|0)$/ },
	{ iri: XSD.anyURI, pattern: /^[a-zA-Z][\w+.-]*:\S*$/ },
	{ iri: MARKDOWN_DATATYPE }
];

/**
 * The datatypes whose values are numbers, written in the editor font and stepped with the arrows.
 */
const NUMERIC: ReadonlySet<string> = new Set([XSD.integer, XSD.decimal, XSD.double, XSD.float]);

/**
 * What the literal fields know about datatypes: which of them are numbers, and which text each
 * takes. How they are named is the components' to say.
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
	 * Indicate whether a term fits its datatype: a literal whose text its datatype takes, or a
	 * term that is no typed literal.
	 * @param term The term.
	 * @returns `true` when the term fits.
	 */
	static fitsTerm(term: TermRef): boolean {
		return term.kind !== 'literal' || !term.datatype || LiteralDatatypes.fits(term.datatype, term.value);
	}
}
