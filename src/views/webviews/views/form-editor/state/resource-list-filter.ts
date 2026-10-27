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
 * What the list is narrowed by.
 */
export interface ResourceListCriteria {
	/**
	 * The text typed into the filter field.
	 */
	text?: string;

	/**
	 * The node of the definition tree the list is narrowed to.
	 */
	type?: TypeFilter;

	/**
	 * Whether the terms of other vocabularies the document only declares are left out.
	 */
	hideExternalDeclarations?: boolean;
}

/**
 * Narrows the resource list: by the text typed into the filter field, which matches the label,
 * the description, the IRI and the prefixed name ignoring case; by the node chosen in the
 * definition tree; and by leaving out external declarations. The order of the resources is kept.
 */
export class ResourceListFilter {
	private readonly _needle: string;

	/**
	 * Create a filter.
	 * @param _criteria What the list is narrowed by.
	 */
	constructor(private readonly _criteria: ResourceListCriteria = {}) {
		this._needle = (_criteria.text ?? '').trim().toLowerCase();
	}

	/**
	 * Indicate whether the text filter is narrowing the list at all.
	 * @returns `true` when the filter has text.
	 */
	get hasText(): boolean {
		return this._needle.length > 0;
	}

	/**
	 * Indicate whether a resource passes the filter.
	 * @param resource The resource to test.
	 * @returns `true` when it passes.
	 */
	matches(resource: ResourceSummary): boolean {
		return this._matchesText(resource) && this._matchesType(resource) && !(this._criteria.hideExternalDeclarations && resource.externalDeclaration);
	}

	/**
	 * Get the resources that pass the filter, in their order.
	 * @param resources The resources of the document.
	 * @returns The resources to show, the same array when nothing narrows the list.
	 */
	apply(resources: ResourceSummary[]): ResourceSummary[] {
		if (!this.hasText && !this._criteria.type && !this._criteria.hideExternalDeclarations) {
			return resources;
		}

		return resources.filter(resource => this.matches(resource));
	}

	/**
	 * Indicate whether a resource matches the text, which a blank text always does.
	 * @param resource The resource to test.
	 * @returns `true` when it matches.
	 */
	private _matchesText(resource: ResourceSummary): boolean {
		if (!this.hasText) {
			return true;
		}

		const iri = resource.term.kind === 'iri' ? resource.term.iri : resource.id;

		return [iri, resource.prefixedName ?? '', resource.label, resource.description ?? ''].join(' ').toLowerCase().includes(this._needle);
	}

	/**
	 * Indicate whether the tree lists a resource under the chosen node, which it does for every
	 * resource when no node is chosen.
	 * @param resource The resource to test.
	 * @returns `true` when it does.
	 */
	private _matchesType(resource: ResourceSummary): boolean {
		return this._criteria.type === undefined || this._criteria.type.resourceIds.has(resource.id);
	}
}
