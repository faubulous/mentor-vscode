/**
 * A pattern that matches any blank node. Blank node identifiers are assigned per parse and cannot
 * be compared across an edit, so a blank node is looked for as any blank node.
 */
export interface AnyBlankNode {
	/**
	 * Tells the pattern apart from the RDF/JS terms it stands among.
	 */
	termType: 'AnyBlankNode';
}

/**
 * The pattern that matches any blank node.
 */
export const ANY_BLANK_NODE: AnyBlankNode = { termType: 'AnyBlankNode' };
