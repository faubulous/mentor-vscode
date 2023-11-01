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
export function toJsonId(uri: string) {
	if (!uri) {
		return uri;
	}

	let u = uri.split('//')[1];
	u = u.replace(/[^a-zA-Z0-9]/g, '.');

	if (u.endsWith('.')) {
		return u.slice(0, -1);
	}

	return u;
}