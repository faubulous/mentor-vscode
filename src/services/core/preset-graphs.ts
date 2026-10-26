import { Store, _OWL, _RDF, _RDFA, _RDFS, _SH, _SKOS, _SPARQL, _XSD } from '@faubulous/mentor-rdf';
import owl from '@faubulous/mentor-rdf/ontologies/owl.ttl';
import rdf from '@faubulous/mentor-rdf/ontologies/rdf.ttl';
import rdfa from '@faubulous/mentor-rdf/ontologies/rdfa.ttl';
import rdfs from '@faubulous/mentor-rdf/ontologies/rdfs.ttl';
import sh from '@faubulous/mentor-rdf/ontologies/sh.ttl';
import skos from '@faubulous/mentor-rdf/ontologies/skos.ttl';
import sparql from '@faubulous/mentor-rdf/ontologies/sparql.ttl';
import xsd from '@faubulous/mentor-rdf/ontologies/xsd.ttl';
import { PresetGraph } from '@src/services/core/preset-graph';
import { PRESET_SHAPE_GRAPHS } from '@src/services/validation/presets';

/**
 * The RDF framework vocabularies, which are required for providing completions,
 * hovers and definitions for built-in concepts. Each is loaded into the graph
 * named by its namespace IRI.
 */
export const FRAMEWORK_VOCABULARY_GRAPHS: PresetGraph[] = [
	{ path: 'vocabularies/rdf.ttl', graphIri: _RDF, source: rdf, executeInference: true },
	{ path: 'vocabularies/rdfa.ttl', graphIri: _RDFA, source: rdfa, executeInference: true },
	{ path: 'vocabularies/rdfs.ttl', graphIri: _RDFS, source: rdfs, executeInference: true },
	{ path: 'vocabularies/owl.ttl', graphIri: _OWL, source: owl, executeInference: true },
	{ path: 'vocabularies/sh.ttl', graphIri: _SH, source: sh, executeInference: true },
	{ path: 'vocabularies/skos.ttl', graphIri: _SKOS, source: skos, executeInference: true },
	{ path: 'vocabularies/sparql.ttl', graphIri: _SPARQL, source: sparql, executeInference: true },
	{ path: 'vocabularies/xsd.ttl', graphIri: _XSD, source: xsd, executeInference: true },
];

/**
 * All graphs that ship with Mentor: the framework vocabularies and the preset
 * shape graphs.
 */
export const PRESET_GRAPHS: PresetGraph[] = [
	...FRAMEWORK_VOCABULARY_GRAPHS,
	...PRESET_SHAPE_GRAPHS,
];

/**
 * Loads the RDF framework vocabularies into the store.
 * @param store The store to load the vocabularies into.
 */
export function loadFrameworkVocabularies(store: Store): void {
	for (const graph of FRAMEWORK_VOCABULARY_GRAPHS) {
		store.loadTurtle(graph.source, graph.graphIri, graph.executeInference);
	}
}
