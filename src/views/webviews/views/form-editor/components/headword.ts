import { humanize } from '@src/utilities/string';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { ResourceSummary } from '../form-editor-model';

/**
 * Get the headword of a resource: its stated label, or the local name of its IRI in words.
 * @param resource The resource.
 * @returns The headword.
 */
export function getHeadword(resource: Pick<ResourceSummary, 'label' | 'hasLabel' | 'term'>): string {
	if (resource.hasLabel || resource.term.kind !== 'iri') {
		return resource.label;
	}

	return humanize(getLocalPartAndQuery(resource.term.iri), false);
}
