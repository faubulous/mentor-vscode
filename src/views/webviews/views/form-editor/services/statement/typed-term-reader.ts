import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { getIriFromText, splitPrefixedName } from '@src/utilities/prefixed-name';
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
 * An IRI written without angle brackets: one with an authority, such as `https://…`, or a URN.
 */
const BARE_IRI = /^([A-Za-z][A-Za-z\d+.-]*:\/\/|urn:)[^\s<>"{}|\\^`]+$/i;

/**
 * Reads what is typed into a field of a statement row as the resource it names: a prefixed name, an
 * `<iri>`, or, for the text of a literal turned into a resource, an IRI without angle brackets. Text
 * for a literal is never read: a literal is the text as typed, never parsed as Turtle.
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
}
