import { OWL, RDF, RDFS } from '@faubulous/mentor-rdf';
import { PropertyView, ResourceDetail, TermRef, TermView } from '@src/views/webviews/views/form-editor/form-editor-model';
import { EXAMPLE_NAMESPACE, LINE_TEST_NAMESPACES } from './line-fixtures';

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

	return { term: { kind: 'iri', iri: LINE_TEST_NAMESPACES[prefix] + localName }, prefixedName, label, editable: true };
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
