import { RDF, RDFS, Uri, _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, _XSD } from '@faubulous/mentor-rdf';
import { ResourceIndex, ResourceIndexEntry } from './resource-index';

/**
 * The predicates a declaration may state without saying anything of its own about the resource:
 * what it is, and which vocabulary defines it.
 */
const DECLARING_PREDICATES = new Set([RDF.type, RDFS.isDefinedBy]);

/**
 * The vocabularies documents build on rather than define, which never count as a document's own
 * namespace however many of their terms it redeclares. The Dublin Core namespaces have no
 * constant in mentor-rdf.
 */
const FOUNDATION_NAMESPACES = new Set([
	_RDF,
	_RDFS,
	_OWL,
	_XSD,
	_SKOS,
	_SKOS_XL,
	_SH,
	'http://purl.org/dc/terms/',
	'http://purl.org/dc/elements/1.1/'
]);

/**
 * Tells the terms of other vocabularies that a document only declares, as ontology editors such
 * as Protégé write them, from the resources it describes.
 */
export class ExternalDeclarationDetector {
	private readonly _ownNamespaces: Set<string>;

	/**
	 * Create a detector for a document.
	 * @param index The index of the document.
	 * @param namespaces Prefix to namespace IRI, as the document declares them.
	 */
	constructor(index: ResourceIndex, namespaces: Record<string, string>) {
		this._ownNamespaces = ExternalDeclarationDetector._findOwnNamespaces(index, namespaces);
	}

	/**
	 * The namespaces the document defines its own terms in: the namespace of the empty prefix,
	 * when it declares one, and the namespace most of its resources are written in, leaving out
	 * the foundation vocabularies such as RDF Schema and OWL.
	 * @returns The namespace IRIs.
	 */
	get ownNamespaces(): ReadonlySet<string> {
		return this._ownNamespaces;
	}

	/**
	 * Tell whether a resource is only declared here: a term of another vocabulary that the
	 * document repeats with its type, saying nothing else of its own about it.
	 * @param entry The resource.
	 * @returns `true` for an external declaration.
	 */
	isExternalDeclaration(entry: ResourceIndexEntry): boolean {
		if (entry.term.kind !== 'iri' || this._isOwnTerm(entry.term.iri)) {
			return false;
		}

		return ExternalDeclarationDetector.statesNothingOfItsOwn(entry);
	}

	/**
	 * Tell whether every statement about a resource only declares it: its types, the vocabulary
	 * that defines it, or an empty literal.
	 * @param entry The resource.
	 * @returns `true` when the resource states nothing of its own.
	 */
	static statesNothingOfItsOwn(entry: ResourceIndexEntry): boolean {
		return entry.quads.every(quad =>
			DECLARING_PREDICATES.has(quad.predicate.value) || (quad.object.termType === 'Literal' && quad.object.value.trim() === '')
		);
	}

	/**
	 * Tell whether an IRI names a term of one of the document's own namespaces. The IRI of a
	 * namespace itself, such as `http://example.org/ns#`, names no term in it.
	 * @param iri The IRI.
	 * @returns `true` for an own term.
	 */
	private _isOwnTerm(iri: string): boolean {
		const namespace = Uri.getNamespaceIri(iri);

		return namespace !== iri && this._ownNamespaces.has(namespace);
	}

	/**
	 * Find the namespaces the document defines its own terms in.
	 * @param index The index of the document.
	 * @param namespaces Prefix to namespace IRI, as the document declares them.
	 * @returns The namespace IRIs.
	 */
	private static _findOwnNamespaces(index: ResourceIndex, namespaces: Record<string, string>): Set<string> {
		const own = new Set<string>();

		if (namespaces['']) {
			own.add(namespaces['']);
		}

		const majority = ExternalDeclarationDetector._majorityNamespace(index);

		if (majority) {
			own.add(majority);
		}

		return own;
	}

	/**
	 * The namespace most of the IRI resources of the document are written in, other than the
	 * foundation vocabularies; the first of equally frequent ones.
	 * @param index The index of the document.
	 * @returns The namespace IRI, or `undefined` when the document has no such resource.
	 */
	private static _majorityNamespace(index: ResourceIndex): string | undefined {
		const counts = new Map<string, number>();

		for (const entry of index.entries.values()) {
			if (entry.term.kind !== 'iri') {
				continue;
			}

			const namespace = Uri.getNamespaceIri(entry.term.iri);

			if (namespace !== entry.term.iri && !FOUNDATION_NAMESPACES.has(namespace)) {
				counts.set(namespace, (counts.get(namespace) ?? 0) + 1);
			}
		}

		let best: [string, number] | undefined;

		for (const count of counts) {
			if (!best || count[1] > best[1]) {
				best = count;
			}
		}

		return best?.[0];
	}
}
