import { Range } from 'vscode-languageserver/browser';

/**
 * Parsed content data from an RDF/XML document.
 */
export interface XmlParseResult {
	/**
	 * The base IRI of the document.
	 */
	baseIri?: string;

	/**
	 * Maps prefixes to namespace IRIs.
	 */
	namespaces: { [key: string]: string };

	/**
	 * Maps namespace IRIs to the locations where they are defined.
	 */
	namespaceDefinitions: { [key: string]: Range[] };

	/**
	 * Maps IRIs that appear as subjects to the locations where they appear.
	 */
	subjects: { [key: string]: Range[] };

	/**
	 * Maps IRIs of all resources to the locations where they appear.
	 */
	references: { [key: string]: Range[] };

	/**
	 * Maps IRIs of subjects that have an asserted rdf:type.
	 */
	typeAssertions: { [key: string]: Range[] };

	/**
	 * Maps IRIs of subjects that are class or property definitions.
	 */
	typeDefinitions: { [key: string]: Range[] };

	/**
	 * Ranges where text literals appear in the document.
	 */
	textLiteralRanges: Range[];
}
