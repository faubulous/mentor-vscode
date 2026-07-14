import { Store } from '@faubulous/mentor-rdf';
import basicOntologyShapes from './basic-ontology.shape.ttl';
import basicTaxonomyShapes from './basic-taxonomy.shape.ttl';

/**
 * Graph URI of the bundled "Basic Ontology" SHACL shape graph. A w3id.org
 * permanent identifier that redirects to the bundled file's source on GitHub.
 */
export const BASIC_ONTOLOGY_SHAPES_URI = 'https://w3id.org/mentor/shacl/profiles/basic-ontology';

/**
 * Graph URI of the bundled "Basic Taxonomy" SHACL shape graph. A w3id.org
 * permanent identifier that redirects to the bundled file's source on GitHub.
 */
export const BASIC_TAXONOMY_SHAPES_URI = 'https://w3id.org/mentor/shacl/profiles/basic-taxonomy';

/**
 * Loads the bundled SHACL shape graphs referenced by the built-in validation
 * profiles shipped as the `mentor.shacl.validation` manifest default.
 * Inference is skipped: the graphs are only ever read as shape datasets.
 */
export function loadPresetShapeGraphs(store: Store): void {
	store.loadTurtle(basicOntologyShapes, BASIC_ONTOLOGY_SHAPES_URI, false);
	store.loadTurtle(basicTaxonomyShapes, BASIC_TAXONOMY_SHAPES_URI, false);
}
