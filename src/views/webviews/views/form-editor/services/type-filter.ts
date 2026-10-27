import { ResourceId, ResourceSummary } from '../form-editor-model';

/**
 * A narrowing of the list to the resources the definition tree lists under a node, such as the
 * individuals of a class or the properties of a property type, chosen in the tree.
 */
export interface TypeFilter {
	/**
	 * The label of the tree node, shown in the toolbar while the filter applies.
	 */
	label: string;

	/**
	 * The resources the tree lists under the node.
	 */
	resourceIds: ReadonlySet<ResourceId>;
}

/**
 * Get the resources a type filter lets through.
 * @param resources The resources of the document.
 * @param filter The filter, if one applies.
 * @returns The resources the tree lists under the node, or all of them without a filter.
 */
export function filterResourcesByType(resources: ResourceSummary[], filter: TypeFilter | undefined): ResourceSummary[] {
	return filter ? resources.filter(resource => filter.resourceIds.has(resource.id)) : resources;
}
