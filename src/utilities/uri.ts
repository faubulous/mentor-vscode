/**
 * Get the portion of a IRI after the first occurance of '#' or the last occurance of '/' or the local part of a namespace IRI.
 * @param iri A IRI.
 * @returns The local part of the IRI.
 */
export function getIriLocalPart(iri: string): string {
	let u = iri;

	// If we have namespace URI, return the label of the document or folder.
	if (u.endsWith('/') || u.endsWith('#')) {
		u = u.substring(0, u.length - 1);
	}

	let ns = getNamespaceIri(u);

	if (ns) {
		return u.replace(ns, "");
	} else {
		return u;
	}
}

/**
 * Get the portion of a URI after the first occurance of '#' or the last occurance of '/'.
 * @param iri A URI.
 * @returns The namespace portion of the URI.
 */
export function getNamespaceIri(iri: string) {
	if (!iri) {
		return iri;
	}

	// Remove any query strings from the URI.
	let u = iri;
	let n = u.indexOf('?');

	if (n > -1) {
		u = iri.substring(0, n);
	}

	// Find the first occurance of '#' and return the substring up to that point.
	n = u.indexOf('#');

	if (n > -1) {
		return u.substring(0, n + 1);
	}

	// Find the last occurance of '/' and return the substring up to that point.
	n = u.lastIndexOf('/');

	// Only return the substring if it is not the 'http://' or 'https://' protocol.
	if (n > 8) {
		return u.substring(0, n + 1);
	} else {
		return u + "/";
	}
}

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