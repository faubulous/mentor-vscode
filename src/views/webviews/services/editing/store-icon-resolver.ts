import { RDF, Store } from '@faubulous/mentor-rdf';
import { getIconContextOf } from '@src/utilities/resource-icon';
import { getSubjectIconName } from '@src/utilities/subject-icon';

/**
 * Tells the glyphs of IRIs from the statements the store holds about them across all its graphs.
 * Memoized until the store changes, because snapshots and searches ask for the same vocabulary
 * terms over and over.
 */
export class StoreIconResolver {
	/**
	 * The version of the store the glyphs were read at.
	 */
	private _version = -1;

	/**
	 * The glyph of each IRI asked for, `undefined` when the store knows no type for it.
	 */
	private readonly _icons = new Map<string, string | undefined>();

	/**
	 * Create a resolver.
	 * @param _store The store.
	 */
	constructor(private readonly _store: Store) { }

	/**
	 * The glyph of an IRI, from its statements in the store.
	 * @param iri The IRI.
	 * @returns The glyph, or `undefined` when the store knows no type for the IRI.
	 */
	resolve(iri: string): string | undefined {
		if (this._version !== this._store.version) {
			this._version = this._store.version;
			this._icons.clear();
		}

		if (this._icons.has(iri)) {
			return this._icons.get(iri);
		}

		const icon = this._read(iri);

		this._icons.set(iri, icon);

		return icon;
	}

	/**
	 * Read the glyph of an IRI from its statements in the store: its types, and, as the cards read
	 * it, its range, which tells a date or a number property from a relation.
	 * @param iri The IRI.
	 * @returns The glyph, or `undefined` when the store knows no type for the IRI.
	 */
	private _read(iri: string): string | undefined {
		const store = this._store;
		const quads = Array.from(store.matchAll(undefined, store.dataFactory.namedNode(iri), null, null, false));
		const types = quads.flatMap(quad => quad.predicate.value === RDF.type && quad.object.termType === 'NamedNode' ? [quad.object.value] : []);

		return types.length > 0 ? getSubjectIconName(types, getIconContextOf(quads)) : undefined;
	}
}
