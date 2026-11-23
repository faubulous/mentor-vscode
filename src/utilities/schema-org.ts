/**
 * The namespaces schema.org terms are written in: the one its vocabulary file declares, and the
 * secure one many documents use.
 */
export const SCHEMA_ORG_NAMESPACES: readonly string[] = ['http://schema.org/', 'https://schema.org/'];

/**
 * The local names of the schema.org terms the form editor reads: the property that names the
 * classes a property takes values of, and the data types, which are written as literals.
 */
export const SchemaOrg = {
	rangeIncludes: 'rangeIncludes',
	DataType: 'DataType',
	Text: 'Text',
	Boolean: 'Boolean',
	Date: 'Date',
	DateTime: 'DateTime',
	Time: 'Time',
	Number: 'Number',
	Integer: 'Integer',
	Float: 'Float'
} as const;

/**
 * The local name of a schema.org term, in either of its namespaces.
 * @param iri The IRI of the term.
 * @returns The local name, or `undefined` for a term of another vocabulary.
 */
export function getSchemaOrgLocalName(iri: string): string | undefined {
	const namespace = SCHEMA_ORG_NAMESPACES.find(candidate => iri.startsWith(candidate));

	return namespace ? iri.slice(namespace.length) : undefined;
}

/**
 * The IRIs of a schema.org term in both of its namespaces.
 * @param localName The local name of the term.
 * @returns The IRIs.
 */
export function getSchemaOrgIris(localName: string): string[] {
	return SCHEMA_ORG_NAMESPACES.map(namespace => namespace + localName);
}
