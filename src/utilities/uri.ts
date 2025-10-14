/**
 * Get a transformed version of the URI that can be used as a JSON identifier which only contains letters, numbers and dots.
 * @param iri A URI.
 * @returns A transformed version which only contains letters, numbers and dots.
 */
export function toJsonId(iri: string): string | undefined {
	if (!iri) {
		return iri;
	}

	let u = iri.split('//')[1];

	if (u) {
		u = u.replace(/[^a-zA-Z0-9]/g, '.');

		return u.endsWith('.') ? u.slice(0, -1) : u;
	} else {
		return undefined;
	}
}

/**
 * Get the IRI from a node ID in the form of `<http://example.com/resource>`.
 * If the node ID does not contain angle brackets, it is returned as is.
 * @param id A node ID.
 * @returns The IRI corresponding to the node ID.
 */
export function getIriFromNodeId(id: string): string {
	const n = id.lastIndexOf('<');

	if (n === -1) {
		return id;
	}

	const m = id.lastIndexOf('>');

	if (n < m) {
		return id.substring(n + 1, m);
	} else {
		return id;
	}
}

/**
 * Get the local part and query from an IRI string.
 * @param iri An IRI string.
 * @returns The local part and query of the IRI, or the IRI itself if it does not contain a local part or query.
 */
export function getLocalPartAndQuery(iri: string): string {
	if (iri.includes('#')) {
		return iri.split('#').pop() || iri;
	} else {
		return iri.split('/').pop() || iri;
	}
}
/**
 * Get the file name from a URI string.
 * @param uri A URI string.
 * @returns The file name, or the URI itself if it does not contain a file name.
 */
export function getFileName(uri: string): string {
	const parts = uri.split('/');

	return parts.length > 0 ? parts[parts.length - 1] : uri;
}

/**
 * Get the folder path from a URI string.
 * @param uri A URI string.
 * @returns The folder path, or the URI itself if it does not contain a path.
 */
export function getPath(uri: string): string {
	const parts = uri.split('/');

	if (parts.length > 1) {
		return parts.slice(0, -1).join('/');
	} else {
		return uri;
	}
}