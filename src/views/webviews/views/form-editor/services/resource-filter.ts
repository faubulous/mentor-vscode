import { ResourceSummary } from '../form-editor-model';

/**
 * Indicate whether a text filter is narrowing the list at all.
 * @param query The text typed into the filter field.
 * @returns `true` when the filter has text.
 */
export function isFiltering(query: string): boolean {
	return query.trim().length > 0;
}

/**
 * Indicate whether a resource matches the text filter. The filter matches the label, the
 * description, the IRI and the prefixed name, ignoring case; a blank filter matches everything.
 * @param resource The resource to test.
 * @param query The text typed into the filter field.
 * @returns `true` when the resource matches.
 */
export function matchesResourceFilter(resource: ResourceSummary, query: string): boolean {
	const needle = query.trim().toLowerCase();

	if (!needle) {
		return true;
	}

	return _searchableText(resource).includes(needle);
}

/**
 * Get the resources matching the text filter, keeping their order.
 * @param resources The resources of the document.
 * @param query The text typed into the filter field.
 * @returns The matching resources, the same array for a blank filter.
 */
export function filterResourcesByText(resources: ResourceSummary[], query: string): ResourceSummary[] {
	if (!isFiltering(query)) {
		return resources;
	}

	return resources.filter(resource => matchesResourceFilter(resource, query));
}

/**
 * The text of a resource the filter looks into, in lower case.
 * @param resource The resource.
 * @returns The text.
 */
function _searchableText(resource: ResourceSummary): string {
	const iri = resource.term.kind === 'iri' ? resource.term.iri : resource.id;

	return [iri, resource.prefixedName ?? '', resource.label, resource.description ?? ''].join(' ').toLowerCase();
}
