import { ResourceSummary } from '../form-editor-model';

/**
 * Leave out the terms of other vocabularies the document only declares, when the view hides
 * them.
 * @param resources The resources of the document.
 * @param hide Whether the view hides external declarations.
 * @returns The resources to show, the same array when nothing is hidden.
 */
export function withoutExternalDeclarations(resources: ResourceSummary[], hide: boolean): ResourceSummary[] {
	return hide ? resources.filter(resource => !resource.externalDeclaration) : resources;
}
