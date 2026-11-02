import { Literal, Term } from '@rdfjs/types';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { TermSerializer } from '@faubulous/mentor-rdf-serializers';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { EditRejectionError } from './edit-rejection';
import { validateIri, validateLanguageTag } from './term-validation';

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

	/**
	 * The spelling of each language tag the document writes, by its lower case form.
	 */
	languageTags: Record<string, string>;
}

/**
 * Writes the terms of an edit into a document the way the document writes them. The serialization
 * itself is the term serializer's; this class validates the terms of an edit and refuses what the
 * document cannot hold, such as a reference to an anonymous blank node. RDF/JS terms hold language
 * tags in lower case: a tag the document writes is written in the document's spelling, any other
 * in lower case.
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
			blankNodeLabels: Object.fromEntries(_options.blankNodeLabels),
			languageTags: _options.languageTags
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
	 * @throws {EditRejectionError} If the term is neither an IRI nor a blank node.
	 */
	writeSubject(term: Term): string {
		if (term.termType !== 'NamedNode' && term.termType !== 'BlankNode') {
			throw new EditRejectionError('invalidTerm', 'Only an IRI or a blank node can be the subject of a statement.');
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

		return this._serializer.serializePredicate(RdfDataFactory.namedNode(iri));
	}

	/**
	 * Write an object term.
	 * @param term The term to write.
	 * @returns The written term.
	 * @throws {EditRejectionError} If the term cannot be written.
	 */
	writeObject(term: Term): string {
		switch (term.termType) {
			case 'NamedNode':
				return this.writeIri(term.value);
			case 'BlankNode':
				return this._writeBlankNode(term.value);
			case 'Literal':
				return this.writeLiteral(term);
			default:
				throw new EditRejectionError('invalidTerm', 'Only an IRI, a blank node or a literal can be the object of a statement.');
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

		return this._serializer.serializeNamedNode(RdfDataFactory.namedNode(iri));
	}

	/**
	 * Write a literal.
	 * @param literal The literal to write.
	 * @returns The written literal.
	 * @throws {EditRejectionError} If the language tag or the datatype is not valid.
	 */
	writeLiteral(literal: Literal): string {
		if (literal.language) {
			validateLanguageTag(literal.language);
		} else {
			validateIri(literal.datatype.value);
		}

		return this._serializer.serializeLiteral(literal);
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

		return this._serializer.serializeBlankNode(RdfDataFactory.blankNode(id));
	}
}
