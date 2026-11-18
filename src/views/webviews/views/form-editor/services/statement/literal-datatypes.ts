import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { Term } from '@rdfjs/types';
import { XsdValidation } from 'rdf-validation';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * The IRI of the Markdown media type, which text literals in Markdown are typed with.
 */
export const MARKDOWN_DATATYPE = 'https://www.iana.org/assignments/media-types/text/markdown';

/**
 * The datatypes the literal fields know and offer, in the order they are offered.
 */
const KNOWN: readonly string[] = [XSD.string, XSD.boolean, XSD.integer, XSD.decimal, XSD.double, XSD.date, XSD.dateTime, XSD.anyURI];

/**
 * The datatypes whose values are numbers, written in the editor font and stepped with the arrows.
 */
const NUMERIC: ReadonlySet<string> = new Set([XSD.integer, XSD.decimal, XSD.double, XSD.float]);

/**
 * The year, month and day a date or a date and time starts with.
 */
const DATE_START = /^-?(\d{4,})-(\d{2})-(\d{2})/;

/**
 * Checks the text of literals of the XSD datatypes, by the rules SHACL validation checks them with.
 */
const XSD_VALIDATION = new XsdValidation();

/**
 * What a text of a datatype must be beyond the rules of the XSD validation: a date names a day its
 * month has, and a URI holds no white space.
 */
const FURTHER_CHECKS: ReadonlyMap<string, (text: string) => boolean> = new Map([
	[XSD.date, _hasExistingDay],
	[XSD.dateTime, _hasExistingDay],
	[XSD.anyURI, (text: string) => !/\s/.test(text)]
]);

/**
 * What the literal fields know about datatypes: which of them they offer, which are numbers, and
 * which text each takes. How they are named is the components' to say.
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
	 * Indicate whether the literal fields know a datatype, and offer it themselves.
	 * @param iri The IRI of the datatype.
	 * @returns `true` for a datatype the fields know.
	 */
	static isKnown(iri: string): boolean {
		return KNOWN.includes(iri);
	}

	/**
	 * Indicate whether a text is a value of a datatype, by the lexical rules of XSD for its
	 * datatypes, with a day that exists in its month for dates and no white space in URIs. A
	 * datatype of another vocabulary takes any text.
	 * @param iri The IRI of the datatype.
	 * @param text The text.
	 * @returns `true` when the text fits.
	 */
	static fits(iri: string, text: string): boolean {
		const literal = RdfDataFactory.literal(text, RdfDataFactory.namedNode(iri));

		return XSD_VALIDATION.validateSimple(literal) && (FURTHER_CHECKS.get(iri)?.(text) ?? true);
	}

	/**
	 * The datatypes the fields know, in the order they are offered.
	 * @returns The IRIs of the datatypes.
	 */
	static known(): readonly string[] {
		return KNOWN;
	}

	/**
	 * Indicate whether a term fits its datatype: a literal whose text its datatype takes, or a
	 * term that is no typed literal.
	 * @param term The term.
	 * @returns `true` when the term fits.
	 */
	static fitsTerm(term: Term): boolean {
		return term.termType !== 'Literal' || LiteralDatatypes.fits(term.datatype.value, term.value);
	}
}

/**
 * Indicate whether the day a date names exists in its month, as the 29th of February does in a leap
 * year only. A text that names no date passes, as the lexical rules judge it.
 * @param text The text of a date, or of a date and time.
 * @returns `true` when the day exists.
 */
function _hasExistingDay(text: string): boolean {
	const match = DATE_START.exec(text);

	if (!match) {
		return true;
	}

	const [year, month, day] = [Number(match[1]) * (text.startsWith('-') ? -1 : 1), Number(match[2]), Number(match[3])];

	return day <= _daysInMonth(year, month);
}

/**
 * The number of days of a month in the proleptic Gregorian calendar XSD dates are written in.
 * @param year The year, where 0 is the year before 1.
 * @param month The month, from 1.
 * @returns The number of days.
 */
function _daysInMonth(year: number, month: number): number {
	if (month === 2) {
		const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

		return leap ? 29 : 28;
	}

	return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
