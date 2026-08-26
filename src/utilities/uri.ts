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
 * Strip the URI scheme and authority from a URI string and decode percent-encoded characters,
 * returning a human-readable path suitable for display.
 * @param uri A URI string (e.g. `workspace:///my%20shapes/file.ttl` or a plain path).
 * @returns The decoded path without scheme prefix, or the decoded input if it contains no scheme.
 */
export function toDisplayPath(uri: string): string {
	const stripped = uri.replace(/^[^:]+:\/\/\//, '');

	return decodeURIComponent(stripped);
}

/**
 * Get the file name from a URI string.
 * @param uri A URI string.
 * @returns The file name, or the URI itself if it does not contain a file name.
 */
export function getFileName(uri: string): string {
	const parts = toDisplayPath(uri).split('/');

	return parts.length > 0 ? parts[parts.length - 1] : uri;
}

/**
 * Get the folder path from a URI string.
 * @param uri A URI string.
 * @returns The folder path, or the URI itself if it does not contain a path.
 */
export function getPath(uri: string): string {
	const parts = toDisplayPath(uri).split('/');

	if (parts.length > 1) {
		return parts.slice(0, -1).join('/');
	} else {
		return uri;
	}
}
/**
 * Get the folder part of a URI string, without the trailing file name.
 *
 * Unlike {@link getPath}, a URI that consists of a file name only yields an empty
 * string rather than the input, so callers can distinguish "no folder" from "a folder
 * that happens to be named like a file".
 * @param uri A URI string.
 * @returns The decoded folder path, or an empty string if the URI has no folder part.
 */
export function getFolderPath(uri: string): string {
	const parts = toDisplayPath(uri).split('/');

	return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

/**
 * The marker standing in for the path segments omitted by {@link shortenPathStart}.
 */
const PATH_ELLIPSIS = '…';

/**
 * Shorten a display path from the start, so that its trailing and most specific segments
 * stay readable inside a width-constrained list column.
 *
 * Leading segments are dropped whole and replaced by an ellipsis. Only when the last
 * segment alone still exceeds the budget is it truncated mid-segment.
 * @param path A display path, such as the result of {@link toDisplayPath}.
 * @param maxLength The maximum number of characters of the returned string.
 * @returns The path unchanged if it fits, otherwise an ellipsis-prefixed tail of it.
 */
export function shortenPathStart(path: string, maxLength: number): string {
	if (maxLength <= 0) {
		return '';
	}

	if (path.length <= maxLength) {
		return path;
	}

	const segments = path.split('/').filter(segment => segment.length > 0);

	for (let index = 1; index < segments.length; index++) {
		const tail = `${PATH_ELLIPSIS}/${segments.slice(index).join('/')}`;

		if (tail.length <= maxLength) {
			return tail;
		}
	}

	const lastSegment = segments[segments.length - 1] ?? path;

	return PATH_ELLIPSIS + lastSegment.slice(lastSegment.length - (maxLength - PATH_ELLIPSIS.length));
}
