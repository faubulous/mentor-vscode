import { extractFromClauseGraphUris } from '@faubulous/mentor-rdf-parsers';

/**
 * Build executeDescribeQuery command args and include graph URIs only when present.
 */
export function getDescribeQueryCommandArgs(
	documentIri: string,
	resourceIri: string,
	query?: string
): [string, string] | [string, string, string[]] {
	const graphUris = extractFromClauseGraphUris(query);

	if (graphUris.length === 0) {
		return [documentIri, resourceIri];
	}

	return [documentIri, resourceIri, graphUris];
}