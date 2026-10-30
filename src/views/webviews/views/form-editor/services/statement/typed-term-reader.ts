import { getIriFromText, splitPrefixedName } from '@src/utilities/prefixed-name';
import { ValueKind } from '@src/utilities/value-kind';
import { TermRef } from '../../form-editor-model';
import { RDF_TYPE, XSD_NAMESPACE } from './well-known-iris';

/**
 * What a typed text reads as: a term, or why it is none.
 */
export type TermReading =
	| { term: TermRef; problem?: undefined }
	| { term?: undefined; problem: string };

/**
 * The datatypes a number or boolean typed without quotes stands for, with the shape of each, in
 * the order they are tried.
 */
const BARE_LITERALS: readonly { pattern: RegExp; datatype: string }[] = [
	{ pattern: /^[+-]?\d+$/, datatype: `${XSD_NAMESPACE}integer` },
	{ pattern: /^[+-]?\d*\.\d+$/, datatype: `${XSD_NAMESPACE}decimal` },
	{ pattern: /^[+-]?(\d+\.\d*|\.\d+|\d+)[eE][+-]?\d+$/, datatype: `${XSD_NAMESPACE}double` },
	{ pattern: /^(true|false)$/, datatype: `${XSD_NAMESPACE}boolean` }
];

/**
 * Reads what is typed into a field of a statement row as a term: a prefixed name or an `<iri>`
 * as an IRI, a number or boolean as a typed literal where the predicate does not take text only,
 * and anything else as text. Text is never parsed as Turtle: a literal is the text as typed.
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
	 * Read a resource.
	 * @param text The typed text.
	 * @returns The IRI, or why the text names none.
	 */
	readIri(text: string): TermReading {
		const trimmed = text.trim();

		if (!TypedTermReader.isName(trimmed)) {
			return { problem: 'A resource is written as a prefixed name or an <IRI>.' };
		}

		const iri = getIriFromText(this._namespaces, trimmed);

		if (iri !== undefined) {
			return { term: { kind: 'iri', iri } };
		}

		return { problem: `The prefix '${splitPrefixedName(trimmed)?.prefix ?? ''}' is not declared.` };
	}

	/**
	 * Read a predicate, which may also be written as `a` for `rdf:type`.
	 * @param text The typed text.
	 * @returns The IRI of the predicate, or why the text names none.
	 */
	readPredicate(text: string): TermReading {
		return text.trim() === 'a' ? { term: { kind: 'iri', iri: RDF_TYPE } } : this.readIri(text);
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
			return { term: { kind: 'literal', value: text } };
		}

		if (TypedTermReader.isName(trimmed)) {
			return this.readIri(trimmed);
		}

		if (range === 'resource') {
			return { problem: 'A resource is written as a prefixed name or an <IRI>.' };
		}

		const bare = BARE_LITERALS.find(candidate => candidate.pattern.test(trimmed));

		return { term: bare ? { kind: 'literal', value: trimmed, datatype: bare.datatype } : { kind: 'literal', value: text } };
	}
}
