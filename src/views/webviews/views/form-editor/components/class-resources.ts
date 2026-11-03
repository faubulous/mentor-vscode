import { OWL, RDFS } from '@faubulous/mentor-rdf/ontologies';
import { ResourceSummary } from '../form-editor-model';

/**
 * The classes among the resources of the document, which the type of a blank node is chosen from:
 * those typed as an OWL or RDFS class.
 * @param resources The resources of the document.
 * @returns The classes, in the order of the resources.
 */
export function getClassResources(resources: readonly ResourceSummary[]): ResourceSummary[] {
	return resources.filter(resource => resource.typeIri === OWL.Class || resource.typeIri === RDFS.Class);
}
