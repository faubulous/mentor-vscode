import { formatIri, getIriFromText } from '@src/utilities/prefixed-name';
import { PredicateEntry } from './predicate-entry';
import { ResourceEntry } from './resource-entry';
import { RDF_TYPE } from './well-known-iris';

/**
 * The entries a vocabulary is built from. The caller assembles them from the term views of a
 * card, the resource summaries of the snapshot and the suggestions the host answered.
 */
export interface StatementVocabularyInput {
	/**
	 * Prefix to namespace IRI.
	 */
	namespaces: Record<string, string>;

	/**
	 * The predicates with their ranges and labels.
	 */
	predicates: readonly PredicateEntry[];

	/**
	 * The resources the editor can offer.
	 */
	resources: readonly ResourceEntry[];
}

/**
 * What the statement editor knows about the terms it may meet: the declared prefixes, the predicates
 * with their ranges and labels, and the resources it can offer, with constant-time lookups by
 * any spelling of a term.
 */
export class StatementVocabulary {
	/**
	 * Prefix to namespace IRI.
	 */
	readonly namespaces: Readonly<Record<string, string>>;

	private readonly _predicates: Map<string, PredicateEntry>;

	private readonly _resources: Map<string, ResourceEntry>;

	/**
	 * Create a vocabulary from its entries. `rdf:type` is always known, so `a` can be written.
	 * @param input The entries.
	 */
	constructor(input: StatementVocabularyInput) {
		this.namespaces = { ...input.namespaces };
		this._predicates = _indexByIri(input.predicates);
		this._resources = _indexByIri(input.resources);

		if (!this._predicates.has(RDF_TYPE)) {
			this._predicates.set(RDF_TYPE, { curie: formatIri(this.namespaces, RDF_TYPE), iri: RDF_TYPE, label: 'type', range: 'resource' });
		}
	}

	/**
	 * Look a predicate up by prefixed name, `<iri>` or full IRI. The keyword `a` finds `rdf:type`.
	 * @param text The predicate as written.
	 * @returns The entry, or `undefined` for an unknown predicate.
	 */
	predicate(text: string): PredicateEntry | undefined {
		return text === 'a' ? this._predicates.get(RDF_TYPE) : this._predicates.get(this.iriOf(text) ?? text);
	}

	/**
	 * Look a resource up by prefixed name, `<iri>` or full IRI.
	 * @param text The resource as written.
	 * @returns The entry, or `undefined` for an unknown resource.
	 */
	resource(text: string): ResourceEntry | undefined {
		return this._resources.get(this.iriOf(text) ?? text);
	}

	/**
	 * Resolve the text of a term to its IRI.
	 * @param text The term as written: `<iri>` or a prefixed name.
	 * @returns The IRI, or `undefined` if the text is neither an IRI reference nor a prefixed
	 * name with a declared prefix.
	 */
	iriOf(text: string): string | undefined {
		return getIriFromText(this.namespaces, text);
	}
}

/**
 * Index entries by their IRI; a later entry with the same IRI replaces an earlier one.
 * @param entries The entries.
 * @returns The index.
 */
function _indexByIri<T extends { iri: string }>(entries: readonly T[]): Map<string, T> {
	const index = new Map<string, T>();

	for (const entry of entries) {
		index.set(entry.iri, entry);
	}

	return index;
}
