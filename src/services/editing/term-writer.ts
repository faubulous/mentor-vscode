import { dataFactory } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { TermSerializer } from '@faubulous/mentor-rdf-serializers';
import { EditRejectionError } from './edit-rejection';
import { TermRef } from './term-ref';
import { validateIri, validateLanguageTag } from './term-validation';

/**
 * A literal in wire form.
 */
export type LiteralRef = Extract<TermRef, { kind: 'literal' }>;

/**
 * What the writer needs to know about the document.
 */
export interface TermWriterOptions {
	/**
	 * Prefix to namespace IRI, as declared in the document.
	 */
	namespaces: Record<string, string>;

	/**
	 * The syntax of the document.
	 */
	syntax: RdfSyntax;

	/**
	 * Whether `rdf:type` is written as `a`.
	 */
	useTypeKeyword: boolean;

	/**
	 * Blank node identifier to the label written in the document, for labelled blank nodes.
	 */
	blankNodeLabels: ReadonlyMap<string, string>;
}

/**
 * Writes the terms of an edit into a document the way the document writes them. The serialization
 * itself is the term serializer's; this class validates the terms of the wire contract, converts
 * them and refuses what the document cannot hold, such as a reference to an anonymous blank node.
 */
export class TermWriter {
	private readonly _serializer: TermSerializer;

	/**
	 * Create a writer for a document.
	 * @param _options What is known about the document.
	 */
	constructor(private readonly _options: TermWriterOptions) {
		this._serializer = TermSerializer.forSyntax(_options.syntax, {
			prefixes: _options.namespaces,
			useRdfTypeShorthand: _options.useTypeKeyword,
			blankNodeLabels: Object.fromEntries(_options.blankNodeLabels)
		});
	}

	/**
	 * Whether the syntax allows prefixed names, `a` and bare literals.
	 * @returns `true` when the syntax abbreviates.
	 */
	get abbreviates(): boolean {
		return this._serializer.abbreviates;
	}

	/**
	 * Write a subject term.
	 * @param term The term to write.
	 * @returns The written term.
	 * @throws {EditRejectionError} If the term is a literal.
	 */
	writeSubject(term: TermRef): string {
		if (term.kind === 'literal') {
			throw new EditRejectionError('invalidTerm', 'A literal cannot be the subject of a statement.');
		}

		return this.writeObject(term);
	}

	/**
	 * Write a predicate, as `a` where the document writes `rdf:type` that way.
	 * @param iri The predicate IRI.
	 * @returns The written predicate.
	 * @throws {EditRejectionError} If the IRI is not valid.
	 */
	writePredicate(iri: string): string {
		validateIri(iri);

		return this._serializer.serializePredicate(dataFactory.namedNode(iri));
	}

	/**
	 * Write an object term.
	 * @param term The term to write.
	 * @returns The written term.
	 * @throws {EditRejectionError} If the term cannot be written.
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
	 * @returns The written IRI.
	 * @throws {EditRejectionError} If the IRI is not valid.
	 */
	writeIri(iri: string): string {
		validateIri(iri);

		return this._serializer.serializeNamedNode(dataFactory.namedNode(iri));
	}

	/**
	 * Write a literal.
	 * @param literal The literal to write.
	 * @returns The written literal.
	 * @throws {EditRejectionError} If the language tag is not valid.
	 */
	writeLiteral(literal: LiteralRef): string {
		if (literal.language) {
			validateLanguageTag(literal.language);
		}

		const languageOrDatatype = literal.language ?? (literal.datatype ? dataFactory.namedNode(literal.datatype) : undefined);

		return this._serializer.serializeLiteral(dataFactory.literal(literal.value, languageOrDatatype));
	}

	/**
	 * Write a reference to a labelled blank node. An anonymous node has no label to refer to.
	 * @param id The identifier of the blank node.
	 * @returns The label written in the document.
	 * @throws {EditRejectionError} If the node has no label.
	 */
	private _writeBlankNode(id: string): string {
		if (!this._options.blankNodeLabels.has(id)) {
			throw new EditRejectionError('invalidTerm', 'An anonymous blank node cannot be referred to by name.');
		}

		return this._serializer.serializeBlankNode(dataFactory.blankNode(id));
	}
}
