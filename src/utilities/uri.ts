/**
 * Get the portion of a URI after the first occurance of '#' or the last occurance of '/'.
 * @param uri A URI.
 * @returns The label portion of the URI.
 */
export function getUriLabel(uri: string): string {
	let u = uri;

	// If we have namespace URI, return the label of the document or folder.
	if (u.endsWith('/') || u.endsWith('#')) {
		u = u.substring(0, u.length - 1);
	}

	let ns = getNamespaceUri(u);

	if (ns) {
		return u.replace(ns, "");
	} else {
		return u;
	}
}

/**
 * Get the portion of a URI after the first occurance of '#' or the last occurance of '/'.
 * @param uri A URI.
 * @returns The namespace portion of the URI.
 */
export function getNamespaceUri(uri: string) {
	if (!uri) {
		return uri;
	}

	// Remove any query strings from the URI.
	let u = uri;
	let n = u.indexOf('?');

	if (n > -1) {
		u = uri.substring(0, n);
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
 * @param uri A URI.
 * @returns A transformed version which only contains letters, numbers and dots.
 */
export function toJsonId(uri: string): string | undefined {
	if (!uri) {
		return uri;
	}

	let u = uri.split('//')[1];

	if (u) {
		u = u.replace(/[^a-zA-Z0-9]/g, '.');

		return u.endsWith('.') ? u.slice(0, -1) : u;
	} else {
		return undefined;
	}
}

// TODO: Move this into an node id class and make the tree node providers use it.
export function hasUri(id?: string): boolean {
	return id ? id.indexOf('|') > -1 : false;
}

export function getNodeIdFromUri(provider: string, uri: string, parentUri?: string): string {
	if (parentUri) {
		return provider + '|' + parentUri + '|' + uri;
	} else {
		return provider + '|' + uri;
	}
}

export function getUriFromNodeId(id: string): string {
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

export function getProviderFromNodeId(id: string): string {
	return id.split('|')[0];
}