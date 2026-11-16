import { OWL, RDF, RDFS, _OWL, _RDF, _RDFS, _SKOS, _XSD } from '@faubulous/mentor-rdf';
import { NamedNode } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PredicateData, ResourceCardBodyData, TermData } from '@src/views/webviews/views/form-editor/form-editor-model';

/**
 * The namespace of the example resources of the webview tests.
 */
export const EXAMPLE_NAMESPACE = 'http://example.org/';

/**
 * The namespaces the webview tests declare.
 */
export const TEST_NAMESPACES: Readonly<Record<string, string>> = {
	rdf: _RDF,
	rdfs: _RDFS,
	owl: _OWL,
	skos: _SKOS,
	xsd: _XSD,
	dcterms: 'http://purl.org/dc/terms/',
	ex: EXAMPLE_NAMESPACE
};

/**
 * The subject of the statement fixtures.
 */
export const TEST_SUBJECT: NamedNode = RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Tree`);

/**
 * Make the view of an IRI written with a test prefix.
 * @param prefixedName The prefixed name.
 * @param label The label of the term.
 * @returns The view.
 */
export function createIriView(prefixedName: string, label?: string): TermData {
	const [prefix, localName] = prefixedName.split(':');

	return { term: RdfDataFactory.namedNode(TEST_NAMESPACES[prefix] + localName), prefixedName, label, editable: true };
}

/**
 * Make the view of a literal.
 * @param value The value.
 * @param language Its language tag.
 * @returns The view.
 */
export function createLiteralView(value: string, language?: string): TermData {
	return { term: RdfDataFactory.literal(value, language), editable: true };
}

/**
 * Make a property.
 * @param predicate The predicate as a prefixed name.
 * @param values The values.
 * @returns The property.
 */
export function createProperty(predicate: string, values: TermData[]): PredicateData {
	return { predicate: createIriView(predicate), values };
}

/**
 * Make the statements of the test subject.
 * @param properties Its properties.
 * @returns The statements.
 */
export function createTestCardBody(properties: PredicateData[]): ResourceCardBodyData {
	return { subject: TEST_SUBJECT, predicates: properties };
}

/**
 * The statements the statement tests share: a type, a label and a subclass statement.
 * @returns The statements.
 */
export function createSampleCardBody(): ResourceCardBodyData {
	return createTestCardBody([
		{ predicate: { term: RdfDataFactory.namedNode(RDF.type), prefixedName: 'rdf:type', editable: true }, values: [{ term: RdfDataFactory.namedNode(OWL.Class), prefixedName: 'owl:Class', label: 'Class', editable: true }] },
		{ predicate: { term: RdfDataFactory.namedNode(RDFS.label), prefixedName: 'rdfs:label', editable: true }, values: [createLiteralView('Tree', 'en')] },
		{ predicate: { term: RdfDataFactory.namedNode(RDFS.subClassOf), prefixedName: 'rdfs:subClassOf', editable: true }, values: [{ term: RdfDataFactory.namedNode(OWL.Thing), prefixedName: 'owl:Thing', label: 'Thing', editable: true }] }
	]);
}

/**
 * Give the values of the statements about a resource the anchors the host reports for written
 * values, so its rows can be edited: each value gets a distinct offset, as if written one after the
 * other.
 * @param cardBody The statements.
 * @returns The statements with anchored values.
 */
export function withAnchors(cardBody: ResourceCardBodyData): ResourceCardBodyData {
	let anchor = 100;

	return {
		...cardBody,
		predicates: cardBody.predicates.map(property => ({
			...property,
			values: property.values.map(value => ({ ...value, anchor: anchor += 10 }))
		}))
	};
}
