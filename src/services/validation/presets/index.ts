import { Store } from '@faubulous/mentor-rdf';
import basicOntologyShapes from '@src/services/validation/profiles/ontology-1.0.shape.ttl';
import basicTaxonomyShapes from '@src/services/validation/profiles/taxonomy-1.0.shape.ttl';
import { BASIC_ONTOLOGY_SHAPES_URI, BASIC_TAXONOMY_SHAPES_URI } from '../template-definitions';

export * from '../template-definitions';

/**
 * The bundled Turtle source of each preset shape graph, keyed by template id. Used
 * both to seed the in-memory store ({@link loadPresetShapeGraphs}) and to materialize
 * a frozen copy into the workspace when a template is instantiated.
 */
const PRESET_SHAPE_SOURCES: Record<string, string> = {
	'basic-ontology': basicOntologyShapes,
	'basic-taxonomy': basicTaxonomyShapes,
};

/**
 * Returns the bundled Turtle source for a preset shape graph, or `undefined` when
 * the template id is unknown.
 */
export function getPresetShapeSource(templateId: string): string | undefined {
	return PRESET_SHAPE_SOURCES[templateId];
}

/**
 * Loads the bundled SHACL shape graphs referenced by the built-in validation
 * templates into the store. Inference is skipped: the graphs are only ever read
 * as shape datasets.
 */
export function loadPresetShapeGraphs(store: Store): void {
	store.loadTurtle(basicOntologyShapes, BASIC_ONTOLOGY_SHAPES_URI, false);
	store.loadTurtle(basicTaxonomyShapes, BASIC_TAXONOMY_SHAPES_URI, false);
}
