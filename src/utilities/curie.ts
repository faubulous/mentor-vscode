const CURIE = /^([A-Za-z][\w.-]*)?:(.*)$/;
const LOCAL_NAME = /^[A-Za-z_][\w.-]*$/;

/**
 * The parts of a prefixed name.
 */
export interface CuriePart {
	/**
	 * The prefix, empty for `:local`.
	 */
	prefix: string;

	/**
	 * The local part after the colon.
	 */
	local: string;
}

/**
 * Split a prefixed name into its prefix and local part.
 * @param text The text to split.
 * @returns The parts, or `undefined` if the text is not written as `prefix:local`.
 */
export function splitCurie(text: string): CuriePart | undefined {
	const match = CURIE.exec(text);

	return match ? { prefix: match[1] ?? '', local: match[2] } : undefined;
}

/**
 * Expand a prefixed name to its IRI.
 * @param text The prefixed name.
 * @param namespaces Prefix to namespace IRI.
 * @returns The IRI, or the text unchanged if it is not a prefixed name with a declared prefix.
 */
export function expandCurie(text: string, namespaces: Readonly<Record<string, string>>): string {
	const parts = splitCurie(text);

	if (parts && namespaces[parts.prefix] !== undefined) {
		return namespaces[parts.prefix] + parts.local;
	}

	return text;
}

/**
 * Resolve the text of a term to its IRI.
 * @param text The term as written: `<iri>` or a prefixed name.
 * @param namespaces Prefix to namespace IRI.
 * @returns The IRI, or `undefined` if the text is neither an IRI reference nor a prefixed name
 * with a declared prefix.
 */
export function iriOfTermText(text: string, namespaces: Readonly<Record<string, string>>): string | undefined {
	if (text.startsWith('<') && text.endsWith('>')) {
		return text.slice(1, -1);
	}

	const parts = splitCurie(text);

	return parts && namespaces[parts.prefix] !== undefined ? expandCurie(text, namespaces) : undefined;
}

/**
 * Write an IRI as a prefixed name when a declared namespace covers it and the rest is a valid
 * local name, otherwise as an IRI reference `<iri>`. The longest matching namespace wins.
 * @param iri The IRI.
 * @param namespaces Prefix to namespace IRI.
 * @returns The prefixed name or the IRI reference.
 */
export function compressIri(iri: string, namespaces: Readonly<Record<string, string>>): string {
	let best: string | undefined;
	let bestLength = -1;

	for (const [prefix, namespace] of Object.entries(namespaces)) {
		const local = iri.slice(namespace.length);

		if (iri.startsWith(namespace) && LOCAL_NAME.test(local) && namespace.length > bestLength) {
			best = `${prefix}:${local}`;
			bestLength = namespace.length;
		}
	}

	return best ?? `<${iri}>`;
}

/**
 * Get the last path segment or fragment of an IRI.
 * @param iri The IRI.
 * @returns The local name, or the IRI itself when it has no separator.
 */
export function localNameOf(iri: string): string {
	const match = /[#/]([^#/]+)$/.exec(iri);

	return match ? match[1] : iri;
}
