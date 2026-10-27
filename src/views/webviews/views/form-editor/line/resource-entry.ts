/**
 * A resource the line editor knows, from a vocabulary or from the document itself.
 */
export interface ResourceEntry {
	/**
	 * The prefixed name, or `<iri>` when no prefix is declared.
	 */
	curie: string;

	/**
	 * The IRI.
	 */
	iri: string;

	/**
	 * The label shown for the resource.
	 */
	label: string;

	/**
	 * Whether the resource comes from a vocabulary or is described in this document.
	 */
	kind: 'vocab' | 'local';

	/**
	 * The glyph that marks what kind of resource this is.
	 */
	iconName?: string;
}
