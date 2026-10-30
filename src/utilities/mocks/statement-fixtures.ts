import { OWL, RDF, RDFS, _OWL, _RDF, _RDFS, _SKOS, _XSD } from '@faubulous/mentor-rdf';
import { PropertyView, ResourceDetail, TermRef, TermView } from '@src/views/webviews/views/form-editor/form-editor-model';

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
export const TEST_SUBJECT: TermRef = { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Tree` };

/**
 * The resource identifier of the test subject.
 */
export const TEST_SUBJECT_ID = 'i:tree';

/**
 * Make the view of an IRI written with a test prefix.
 * @param prefixedName The prefixed name.
 * @param label The label of the term.
 * @returns The view.
 */
export function createIriView(prefixedName: string, label?: string): TermView {
	const [prefix, localName] = prefixedName.split(':');

	return { term: { kind: 'iri', iri: TEST_NAMESPACES[prefix] + localName }, prefixedName, label, editable: true };
}

/**
 * Make the view of a literal.
 * @param value The value.
 * @param language Its language tag.
 * @returns The view.
 */
export function createLiteralView(value: string, language?: string): TermView {
	return { term: { kind: 'literal', value, language }, editable: true };
}

/**
 * Make a property.
 * @param predicate The predicate as a prefixed name.
 * @param values The values.
 * @returns The property.
 */
export function createProperty(predicate: string, values: TermView[]): PropertyView {
	return { predicate: createIriView(predicate), values };
}

/**
 * Make the detail of the test subject.
 * @param properties Its properties.
 * @returns The detail.
 */
export function createTestResourceDetail(properties: PropertyView[]): ResourceDetail {
	return { id: TEST_SUBJECT_ID, term: TEST_SUBJECT, properties };
}

/**
 * The detail the statement tests share: a type, a label and a subclass statement.
 * @returns The detail.
 */
export function createSampleResourceDetail(): ResourceDetail {
	return createTestResourceDetail([
		{ predicate: { term: { kind: 'iri', iri: RDF.type }, prefixedName: 'rdf:type', editable: true }, values: [{ term: { kind: 'iri', iri: OWL.Class }, prefixedName: 'owl:Class', label: 'Class', editable: true }] },
		{ predicate: { term: { kind: 'iri', iri: RDFS.label }, prefixedName: 'rdfs:label', editable: true }, values: [createLiteralView('Tree', 'en')] },
		{ predicate: { term: { kind: 'iri', iri: RDFS.subClassOf }, prefixedName: 'rdfs:subClassOf', editable: true }, values: [{ term: { kind: 'iri', iri: OWL.Thing }, prefixedName: 'owl:Thing', label: 'Thing', editable: true }] }
	]);
}

/**
 * Give the values of a detail the anchors the host reports for written values, so its rows can
 * be edited: each value gets a distinct offset, as if written one after the other.
 * @param detail The detail.
 * @returns The detail with anchored values.
 */
export function withAnchors(detail: ResourceDetail): ResourceDetail {
	let anchor = 100;

	return {
		...detail,
		properties: detail.properties.map(property => ({
			...property,
			values: property.values.map(value => ({ ...value, anchor: anchor += 10 }))
		}))
	};
}
