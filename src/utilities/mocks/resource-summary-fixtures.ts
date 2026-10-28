import { ResourceSummary } from '@src/views/webviews/views/form-editor/form-editor-model';
import { EXAMPLE_NAMESPACE } from './line-fixtures';

/**
 * Make the summary of a resource of the example namespace.
 * @param localName The local name of the resource.
 * @param extra Further fields of the summary.
 * @returns The summary.
 */
export function createResourceSummary(localName: string, extra: Partial<ResourceSummary> = {}): ResourceSummary {
	const iri = `${EXAMPLE_NAMESPACE}${localName}`;

	return {
		id: `i:${iri}`,
		term: { kind: 'iri', iri },
		label: localName,
		prefixedName: `ex:${localName}`,
		iconName: 'mentor-rdf-class',
		propertyCount: 2,
		valueCount: 3,
		nested: false,
		hasLabel: true,
		...extra
	};
}
