import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceListItemData } from '@src/views/webviews/views/form-editor/form-editor-model';
import { EXAMPLE_NAMESPACE } from './statement-fixtures';

/**
 * Make the list item of a resource of the example namespace.
 * @param localName The local name of the resource.
 * @param extra Further fields of the list item.
 * @returns The list item.
 */
export function createResourceListItem(localName: string, extra: Partial<ResourceListItemData> = {}): ResourceListItemData {
	const iri = `${EXAMPLE_NAMESPACE}${localName}`;

	return {
		subject: RdfDataFactory.namedNode(iri),
		label: localName,
		prefixedName: `ex:${localName}`,
		iconName: 'mentor-rdf-class',
		propertyCount: 2,
		hasLabel: true,
		...extra
	};
}
