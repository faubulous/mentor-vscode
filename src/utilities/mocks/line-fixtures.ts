import { OWL, RDF, RDFS, SKOS, XSD, _OWL, _RDF, _RDFS, _SKOS, _XSD } from '@faubulous/mentor-rdf';
import { LineVocabulary } from '@src/views/webviews/views/form-editor/line/line-vocabulary';

/**
 * The namespace of the Dublin Core terms, which mentor-rdf has no constant for.
 */
export const DCTERMS_NAMESPACE = 'http://purl.org/dc/terms/';

/**
 * The namespace of the example resources of the line tests.
 */
export const EXAMPLE_NAMESPACE = 'http://example.org/';

/**
 * The namespaces the line tests declare.
 */
export const LINE_TEST_NAMESPACES: Readonly<Record<string, string>> = {
	rdf: _RDF,
	rdfs: _RDFS,
	owl: _OWL,
	skos: _SKOS,
	xsd: _XSD,
	dcterms: DCTERMS_NAMESPACE,
	ex: EXAMPLE_NAMESPACE
};

/**
 * Build the vocabulary the line tests share: a few predicates of every range and a few
 * vocabulary and local resources.
 * @returns The vocabulary.
 */
export function createTestLineVocabulary(): LineVocabulary {
	return new LineVocabulary({
		namespaces: LINE_TEST_NAMESPACES,
		predicates: [
			{ curie: 'rdf:type', iri: RDF.type, label: 'type', range: 'res' },
			{ curie: 'rdfs:label', iri: RDFS.label, label: 'label', range: 'lit' },
			{ curie: 'rdfs:comment', iri: RDFS.comment, label: 'comment', range: 'lit' },
			{ curie: 'skos:prefLabel', iri: SKOS.prefLabel, label: 'preferred label', range: 'lit' },
			{ curie: 'rdfs:subClassOf', iri: RDFS.subClassOf, label: 'subClassOf', range: 'res' },
			{ curie: 'rdfs:range', iri: RDFS.range, label: 'range', range: 'res' },
			{ curie: 'dcterms:modified', iri: `${DCTERMS_NAMESPACE}modified`, label: 'modified', range: 'any' }
		],
		resources: [
			{ curie: 'owl:Class', iri: OWL.Class, label: 'Class', kind: 'vocab' },
			{ curie: 'owl:Thing', iri: OWL.Thing, label: 'Thing', kind: 'vocab' },
			{ curie: 'xsd:integer', iri: XSD.integer, label: 'integer', kind: 'vocab' },
			{ curie: 'ex:Tree', iri: `${EXAMPLE_NAMESPACE}Tree`, label: 'Tree', kind: 'local' },
			{ curie: 'ex:Graph', iri: `${EXAMPLE_NAMESPACE}Graph`, label: 'Graph', kind: 'local' }
		]
	});
}
