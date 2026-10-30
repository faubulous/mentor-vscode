/**
 * Note: Do not add imports here. This file is used in the language server and in the webviews,
 * where neither 'vscode' nor the RDF libraries are available.
 */

/**
 * Maps namespace prefixes to IRIs.
 */
export interface PrefixMap {
	[key: string]: string;
}

/**
 * The parts of a prefixed name.
 */
export interface PrefixedNameParts {
	/**
	 * The prefix before the first colon, empty for `:local`.
	 */
	prefix: string;

	/**
	 * The local name after the first colon.
	 */
	localName: string;
}

/**
 * The reserved character escapes of a local name (`PN_LOCAL_ESC`), e.g. `\-` in `ex:a\-b`.
 */
const LOCAL_NAME_ESCAPE = /\\([_~.\-!$&'()*+,;=/?#@%])/g;

/**
 * A local name that can be written after a prefix without escapes.
 */
const PLAIN_LOCAL_NAME = /^[A-Za-z_][\w.-]*$/;

/**
 * Split a prefixed name at its first colon, as local names may contain colons, e.g. `ex:a:b`.
 * @param name The name to split.
 * @returns The parts, or `undefined` if the name has no colon.
 */
export function splitPrefixedName(name: string): PrefixedNameParts | undefined {
	const colon = name.indexOf(':');

	if (colon < 0) {
		return undefined;
	}

	return { prefix: name.substring(0, colon), localName: name.substring(colon + 1) };
}

/**
 * Get the IRI from a prefixed name, as the RDF readers resolve it: the prefix ends at the
 * first colon, as the local name may contain colons, e.g. `ex:a:b`, and the reserved
 * character escapes of the local name are resolved, e.g. `ex:a\-b` is `…a-b`.
 * Percent-encodings are part of the IRI and are kept.
 * @param prefixes The namespace IRIs by prefix.
 * @param name A prefixed name.
 * @returns The IRI, or `undefined` if the name has no colon or its prefix is not declared.
 */
export function getIriFromPrefixedName(prefixes: Readonly<PrefixMap>, name: string): string | undefined {
	// Located with indexOf instead of split, which allocates an array per name: this runs for
	// every prefixed name in a document.
	const colon = name.indexOf(':');

	if (colon < 0) {
		return undefined;
	}

	const namespaceIri = prefixes[name.substring(0, colon)];

	if (!namespaceIri) {
		return undefined;
	}

	const localName = name.substring(colon + 1);

	return namespaceIri + (localName.includes('\\') ? localName.replace(LOCAL_NAME_ESCAPE, '$1') : localName);
}

/**
 * Get the namespace IRI of a prefixed name; the prefix ends at the first colon.
 * @param prefixes The namespace IRIs by prefix.
 * @param name A prefixed name.
 * @returns The namespace IRI, or `undefined` if the name has no colon or its prefix is not declared.
 */
export function getNamespaceIriFromPrefixedName(prefixes: Readonly<PrefixMap>, name: string): string | undefined {
	const colon = name.indexOf(':');

	if (colon < 0) {
		return undefined;
	}

	return prefixes[name.substring(0, colon)];
}

/**
 * Get the prefixed name of an IRI, when a declared namespace covers it and the rest is a local
 * name that needs no escapes. The longest matching namespace wins.
 * @param prefixes The namespace IRIs by prefix.
 * @param iri The IRI.
 * @returns The prefixed name, or `undefined` if no declared namespace covers the IRI.
 */
export function getPrefixedName(prefixes: Readonly<PrefixMap>, iri: string): string | undefined {
	let prefixedName: string | undefined;
	let namespaceLength = -1;

	for (const [prefix, namespaceIri] of Object.entries(prefixes)) {
		const localName = iri.slice(namespaceIri.length);

		if (iri.startsWith(namespaceIri) && PLAIN_LOCAL_NAME.test(localName) && namespaceIri.length > namespaceLength) {
			prefixedName = `${prefix}:${localName}`;
			namespaceLength = namespaceIri.length;
		}
	}

	return prefixedName;
}

/**
 * Get the IRI from the text of an IRI as it is written in Turtle: an IRI reference `<iri>` or a
 * prefixed name.
 * @param prefixes The namespace IRIs by prefix.
 * @param text The text.
 * @returns The IRI, or `undefined` if the text is neither an IRI reference nor a prefixed name
 * with a declared prefix.
 */
export function getIriFromText(prefixes: Readonly<PrefixMap>, text: string): string | undefined {
	if (text.startsWith('<') && text.endsWith('>')) {
		return text.slice(1, -1);
	}

	return getIriFromPrefixedName(prefixes, text);
}

