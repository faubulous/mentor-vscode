import { Store } from '@faubulous/mentor-rdf';
import basicOntologyShapes from './ontology-1.0.shape.ttl';
import basicTaxonomyShapes from './taxonomy-1.0.shape.ttl';
import { BASIC_ONTOLOGY_SHAPES_URI, BASIC_TAXONOMY_SHAPES_URI } from '../preset-definitions';

/**
 * The bundled Turtle source of each preset shape graph, keyed by preset id. Used
 * both to seed the in-memory store ({@link loadPresetShapeGraphs}) and to write
 * a frozen copy into the workspace when a preset is instantiated.
 */
const PRESET_SHAPE_SOURCES: Record<string, string> = {
	'basic-ontology': basicOntologyShapes,
	'basic-taxonomy': basicTaxonomyShapes,
};

/**
 * Returns the bundled Turtle source for a preset shape graph, or `undefined` when
 * the preset id is unknown.
 */
export function getPresetShapeSource(presetId: string): string | undefined {
	return PRESET_SHAPE_SOURCES[presetId];
}

/**
 * Loads the bundled SHACL shape graphs referenced by the built-in validation
 * presets into the store. Inference is skipped: the graphs are only ever read
 * as shape datasets.
 */
export function loadPresetShapeGraphs(store: Store): void {
	store.loadTurtle(basicOntologyShapes, BASIC_ONTOLOGY_SHAPES_URI, false);
	store.loadTurtle(basicTaxonomyShapes, BASIC_TAXONOMY_SHAPES_URI, false);
}
