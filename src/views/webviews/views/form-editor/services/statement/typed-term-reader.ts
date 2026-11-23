import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { getIriFromText, splitPrefixedName } from '@src/utilities/prefixed-name';
import { ValueKind } from '@src/utilities/value-kind';
import { Literal, NamedNode } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { TermProblem } from './term-problem';

/**
 * What a typed text reads as: a term, or why it is none.
 */
export type TermReading<T extends NamedNode | Literal = NamedNode | Literal> =
	| { term: T; problem?: undefined }
	| { term?: undefined; problem: TermProblem };

/**
 * What a typed text reads as where only a resource is taken: an IRI, or why the text is none.
 */
export type IriReading = TermReading<NamedNode>;

/**
 * The prefix of a prefixed name as it is typed: empty, or a letter followed by the characters a
 * prefix takes, a dot or a dash at its end too, as more is still to come.
 */
const PREFIX_AS_TYPED = /^([A-Za-z][\w.-]*)?$/;

/**
 * An IRI written without angle brackets: one with an authority, such as `https://…`, or a URN.
 */
const BARE_IRI = /^([A-Za-z][A-Za-z\d+.-]*:\/\/|urn:)[^\s<>"{}|\\^`]+$/i;

/**
 * Reads what is typed into a field of a statement row as a term: a prefixed name or an `<iri>`
 * as an IRI where the predicate takes resources, and anything else as text. Text is never parsed
 * as Turtle: a literal is the text as typed, a plain string even where it looks like a number, whose
 * field suggests the datatype instead.
 */
export class TypedTermReader {
	/**
	 * Create a reader for a document.
	 * @param _namespaces Prefix to namespace IRI, as the document declares them.
	 */
	constructor(private readonly _namespaces: Readonly<Record<string, string>>) { }

	/**
	 * Indicate whether a text is written as the name of a resource: a prefixed name or an `<iri>`.
	 * @param text The text.
	 * @returns `true` for a name.
	 */
	static isName(text: string): boolean {
		return /^<[^<>\s]*>$/.test(text) || (!/\s/.test(text) && splitPrefixedName(text) !== undefined);
	}

	/**
	 * Indicate whether a text may still become the name of a resource as more is typed after it: a
	 * beginning of an `<iri>`, or of a prefixed name, whose prefix may still be missing its colon.
	 * @param text The text typed so far.
	 * @returns `true` while the text may become a name.
	 */
	static couldBeName(text: string): boolean {
		if (/\s/.test(text)) {
			return false;
		}

		if (text.startsWith('<')) {
			return /^<[^<>]*>?$/.test(text);
		}

		return PREFIX_AS_TYPED.test(splitPrefixedName(text)?.prefix ?? text);
	}

	/**
	 * Read the text of a literal as the resource it names: a prefixed name, an `<iri>`, or an IRI
	 * written without angle brackets, such as `https://example.org/oak`.
	 * @param text The text.
	 * @returns The IRI, or why the text names none.
	 */
	readResourceText(text: string): IriReading {
		const trimmed = text.trim();
		const reading = this.readIri(trimmed);

		return reading.problem && BARE_IRI.test(trimmed) ? { term: RdfDataFactory.namedNode(trimmed) } : reading;
	}

	/**
	 * Read a resource.
	 * @param text The typed text.
	 * @returns The IRI, or why the text names none.
	 */
	readIri(text: string): IriReading {
		const trimmed = text.trim();

		if (!TypedTermReader.isName(trimmed)) {
			return { problem: { kind: 'notAName' } };
		}

		const iri = getIriFromText(this._namespaces, trimmed);

		if (iri !== undefined) {
			return { term: RdfDataFactory.namedNode(iri) };
		}

		return { problem: { kind: 'undeclaredPrefix', prefix: splitPrefixedName(trimmed)?.prefix ?? '' } };
	}

	/**
	 * Read a predicate, which may also be written as `a` for `rdf:type`.
	 * @param text The typed text.
	 * @returns The IRI of the predicate, or why the text names none.
	 */
	readPredicate(text: string): IriReading {
		return text.trim() === 'a' ? { term: RdfDataFactory.namedNode(RDF.type) } : this.readIri(text);
	}

	/**
	 * Read a new value for a predicate that takes the given kind of values.
	 * @param text The typed text.
	 * @param range What the predicate takes.
	 * @returns The term, or why the text is none; `undefined` when nothing was typed.
	 */
	readValue(text: string, range: ValueKind): TermReading | undefined {
		const trimmed = text.trim();

		if (trimmed === '') {
			return undefined;
		}

		if (range === 'literal') {
			return { term: RdfDataFactory.literal(text) };
		}

		if (TypedTermReader.isName(trimmed)) {
			return this.readIri(trimmed);
		}

		if (range === 'resource') {
			return { problem: { kind: 'notAName' } };
		}

		return { term: RdfDataFactory.literal(text) };
	}
}
