import { Uri } from '@faubulous/mentor-rdf';
import { getIriFromPrefixedName, PrefixMap } from '@src/utilities';

/**
 * Resolves the prefixed names of a document to IRIs while its index maps are built. A
 * document repeats its prefixed names many times; each name is resolved once, so all of
 * its occurrences share one IRI string, which the index maps hash only once.
 */
export class PrefixedNameResolver {
	private readonly _iris = new Map<string, string | undefined>();

	private readonly _normalizedIris = new Map<string, string | undefined>();

	/**
	 * @param _namespaces The namespace IRIs by prefix. Call {@link clear} when a prefix is
	 * declared, as it changes the IRIs of the names that follow.
	 */
	constructor(private readonly _namespaces: PrefixMap) { }

	/**
	 * Returns the IRI of a prefixed name.
	 * @param name The prefixed name, e.g. `ex:Thing`.
	 * @returns The IRI, or `undefined` if the prefix is not declared.
	 */
	getIri(name: string): string | undefined {
		let iri = this._iris.get(name);

		if (iri === undefined && !this._iris.has(name)) {
			iri = getIriFromPrefixedName(this._namespaces, name);

			this._iris.set(name, iri);
		}

		return iri;
	}

	/**
	 * Returns the IRI of a prefixed name without a trailing slash or hash, so that it is
	 * comparable with the output of `vscode.Uri.toString()`.
	 * @param name The prefixed name, e.g. `ex:Thing`.
	 * @returns The normalized IRI, or `undefined` if the prefix is not declared.
	 */
	getNormalizedIri(name: string): string | undefined {
		let iri = this._normalizedIris.get(name);

		if (iri === undefined && !this._normalizedIris.has(name)) {
			const resolvedIri = this.getIri(name);

			iri = resolvedIri ? Uri.getNormalizedUri(resolvedIri) : undefined;

			this._normalizedIris.set(name, iri);
		}

		return iri;
	}

	/**
	 * Forgets the resolved names, e.g. after a prefix was declared.
	 */
	clear(): void {
		this._iris.clear();
		this._normalizedIris.clear();
	}
}
