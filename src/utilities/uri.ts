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