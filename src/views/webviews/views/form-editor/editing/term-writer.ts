import { RDF, XSD } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import {
	escapeIri,
	escapeLocalName,
	escapeString,
	findPrefix,
	isDecimal,
	isDouble,
	isInteger,
	needsLongString
} from '@faubulous/mentor-rdf-serializers';
import { TermRef } from '../form-editor-model';
import { EditRejectionError } from './edit-rejection';
import { validateIri, validateLanguageTag } from './term-validator';

/**
 * A literal in wire form.
 */
export type LiteralRef = Extract<TermRef, { kind: 'literal' }>;

/**
 * What the writer needs to know about the document.
 */
export interface TermWriterOptions {
	/** Prefix to namespace IRI, as declared in the document. */
	namespaces: Record<string, string>;
	syntax: RdfSyntax;
	/** Whether `rdf:type` is written as `a`. */
	useTypeKeyword: boolean;
	/** Blank node identifier to the label written in the document, for labelled blank nodes. */
	blankNodeLabels: ReadonlyMap<string, string>;
}

/**
 * Writes terms the way the document writes them: prefixed names where a prefix is declared,
 * `a` for `rdf:type` when the document uses it, and bare numbers and booleans where the syntax
 * allows. The literal rules mirror the Mentor serializers so a value survives a round trip
 * through the formatter unchanged.
 */
export class TermWriter {
	constructor(private readonly _options: TermWriterOptions) { }

	/**
	 * Whether the syntax allows prefixed names, `a` and bare literals.
	 */
	get abbreviates(): boolean {
		return this._options.syntax === RdfSyntax.Turtle || this._options.syntax === RdfSyntax.TriG;
	}

	/**
	 * Write a subject term.
	 * @param term The term to write.
	 */
	writeSubject(term: TermRef): string {
		if (term.kind === 'literal') {
			throw new EditRejectionError('invalidTerm', 'A literal cannot be the subject of a statement.');
		}

		return this.writeObject(term);
	}

	/**
	 * Write a predicate.
	 * @param iri The predicate IRI.
	 */
	writePredicate(iri: string): string {
		if (iri === RDF.type && this.abbreviates && this._options.useTypeKeyword) {
			return 'a';
		}

		return this.writeIri(iri);
	}

	/**
	 * Write an object term.
	 * @param term The term to write.
	 */
	writeObject(term: TermRef): string {
		switch (term.kind) {
			case 'iri':
				return this.writeIri(term.iri);
			case 'bnode':
				return this._writeBlankNode(term.id);
			default:
				return this.writeLiteral(term);
		}
	}

	/**
	 * Write an IRI as a prefixed name when possible, or as an IRI reference.
	 * @param iri The IRI to write.
	 */
	writeIri(iri: string): string {
		validateIri(iri);

		if (this.abbreviates) {
			const match = findPrefix(iri, this._options.namespaces);

			if (match) {
				return `${match.prefix}:${escapeLocalName(match.localName)}`;
			}
		}

		return `<${escapeIri(iri)}>`;
	}

	/**
	 * Write a literal.
	 * @param literal The literal to write.
	 */
	writeLiteral(literal: LiteralRef): string {
		if (literal.language) {
			validateLanguageTag(literal.language);

			return `"${escapeString(literal.value)}"@${literal.language}`;
		}

		const bare = this._writeBareLiteral(literal);

		if (bare !== undefined) {
			return bare;
		}

		const useLongString = this.abbreviates && needsLongString(literal.value);
		const quote = useLongString ? '"""' : '"';
		const quoted = `${quote}${escapeString(literal.value, useLongString)}${quote}`;

		if (!literal.datatype || literal.datatype === XSD.string) {
			return quoted;
		}

		return `${quoted}^^${this.writeIri(literal.datatype)}`;
	}

	/**
	 * Write a number or boolean without quotes when the syntax allows it and the lexical form is
	 * valid for the datatype.
	 */
	private _writeBareLiteral(literal: LiteralRef): string | undefined {
		if (!this.abbreviates) {
			return undefined;
		}

		const { value, datatype } = literal;

		if (datatype === XSD.boolean && (value === 'true' || value === 'false')) {
			return value;
		}

		if (datatype === XSD.integer && isInteger(value)) {
			return value;
		}

		if (datatype === XSD.decimal && isDecimal(value)) {
			return value;
		}

		if (datatype === XSD.double && isDouble(value)) {
			return value;
		}

		return undefined;
	}

	/**
	 * Write a reference to a labelled blank node. An anonymous node has no label to refer to.
	 */
	private _writeBlankNode(id: string): string {
		const label = this._options.blankNodeLabels.get(id);

		if (!label) {
			throw new EditRejectionError('invalidTerm', 'An anonymous blank node cannot be referred to by name.');
		}

		return label;
	}
}
