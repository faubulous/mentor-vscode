import { describe, expect, it } from 'vitest';
import { OWL, RDFS, XSD } from '@faubulous/mentor-rdf';
import { createTestStatementVocabulary } from '@src/utilities/mocks/statement-vocabulary-fixtures';
import { createIriView, createLiteralView, createProperty } from '@src/utilities/mocks/statement-fixtures';
import { TermView } from '../../form-editor-model';
import { EditableStatement } from '../../state/editable-statement';
import { StatementTextService } from './statement-text-service';

const service = new StatementTextService(createTestStatementVocabulary());

/**
 * The view of a blank node value with its nested node.
 */
function createNestedView(id: string): TermView {
	return { term: { kind: 'bnode', id }, editable: true, nested: { id: `b:${id}`, propertyCount: 1, iconName: 'mentor-rdf-individual' } };
}

describe('StatementTextService.editableStatementOf', () => {
	it('splits a property into its predicate and one value per field', () => {
		const statement = service.editableStatementOf(createProperty('rdfs:label', [createLiteralView('Tree', 'en'), createLiteralView('Baum', 'de')]));

		expect(statement).toEqual(new EditableStatement('rdfs:label', [
			{ kind: 'literal', value: 'Tree', suffix: '@en' },
			{ kind: 'literal', value: 'Baum', suffix: '@de' }
		]));
	});

	it('reads resources, numbers, nested nodes and lists, and writes the type predicate as a', () => {
		const property = createProperty('rdf:type', [
			createIriView('ex:Tree'),
			{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true },
			createNestedView('n1'),
			{ term: { kind: 'bnode', id: 'l' }, editable: true, collection: { items: [createIriView('ex:A'), createLiteralView('b')] } }
		]);

		expect(service.editableStatementOf(property)).toEqual(new EditableStatement('a', [
			{ kind: 'resource', text: 'ex:Tree' },
			{ kind: 'shorthandLiteral', text: '42' },
			{ kind: 'nestedNode' },
			{ kind: 'source', text: '( ex:A "b" )' }
		]));
	});

	it('keeps the views of the terms by the text they are written as', () => {
		const terms = service.termViewsOf(createProperty('rdfs:subClassOf', [createIriView('owl:Thing', 'Thing')]));

		expect(terms['owl:Thing']?.label).toBe('Thing');
		expect(terms['rdfs:subClassOf']?.term).toEqual({ kind: 'iri', iri: RDFS.subClassOf });
	});

	it('refuses to edit a row with a blank node among the items of a list', () => {
		const list = { term: { kind: 'bnode' as const, id: 'l' }, editable: true, collection: { items: [createNestedView('n1')] } };

		expect(service.canEdit(createProperty('ex:p', [list]))).toBe(false);
		expect(service.canEdit(createProperty('ex:p', [createNestedView('n1')]))).toBe(true);
		expect(service.canEdit({ ...createProperty('ex:p', []), predicate: { ...createIriView('ex:p'), editable: false } })).toBe(false);
	});
});

describe('StatementTextService text', () => {
	it('writes the canonical text with escaped literals and valid suffixes, leaving nested nodes off', () => {
		const statement = new EditableStatement('rdfs:label', [{ kind: 'literal', value: 'a "b"', suffix: '@en' }, { kind: 'nestedNode' }, { kind: 'literal', value: 'c', suffix: '@' }]);

		expect(service.canonicalTextOf(statement)).toBe('rdfs:label "a \\"b\\""@en "c"');
		expect(service.canonicalTextOf(new EditableStatement(' ', [{ kind: 'resource', text: 'ex:A' }]))).toBe('');
		expect(service.canonicalTextOf(new EditableStatement('a', [{ kind: 'resource', text: 'owl:Class' }, { kind: 'resource', text: ' ' }]))).toBe('a owl:Class');
	});

	it('writes the statement text for the host with the values separated and a placeholder per nested node', () => {
		const statement = new EditableStatement('ex:p', [{ kind: 'resource', text: 'ex:A' }, { kind: 'nestedNode' }, { kind: 'source', text: '( ex:B "c" )' }, { kind: 'nestedNode' }]);

		expect(service.statementTextOf(statement)).toBe('ex:p ex:A, ( ex:B "c" ), […], […]');
	});

	it('round-trips a property through its fields', () => {
		const property = createProperty('ex:p', [createLiteralView('Tree', 'en'), createIriView('ex:Tree')]);

		expect(service.canonicalTextOf(service.editableStatementOf(property))).toBe('ex:p "Tree"@en ex:Tree');
	});

	it('tells why a text is not a statement', () => {
		expect(service.problemOf('rdfs:label "Tree"')).toBeUndefined();
		expect(service.problemOf('foo:p "Tree"')).toMatch(/foo/);
	});
});

describe('StatementTextService.valueOfTypedText', () => {
	it('reads quoted literals, numbers and lists', () => {
		expect(service.valueOfTypedText('"Tree"@en', 'any')).toEqual({ kind: 'literal', value: 'Tree', suffix: '@en' });
		expect(service.valueOfTypedText('12', 'any')).toEqual({ kind: 'shorthandLiteral', text: '12' });
		expect(service.valueOfTypedText('( ex:a )', 'any')).toEqual({ kind: 'source', text: '( ex:a )' });
	});

	it('reads a name as a resource unless the predicate takes text', () => {
		expect(service.valueOfTypedText('ex:Tree', 'any')).toEqual({ kind: 'resource', text: 'ex:Tree' });
		expect(service.valueOfTypedText('ex:Tree', 'literal')).toEqual({ kind: 'literal', value: 'ex:Tree', suffix: '' });
		expect(service.valueOfTypedText('12', 'literal')).toEqual({ kind: 'literal', value: '12', suffix: '' });
		expect(service.valueOfTypedText('a tree', 'resource')).toEqual({ kind: 'resource', text: 'a tree' });
	});

	it('reads plain text as a literal and nothing from blanks', () => {
		expect(service.valueOfTypedText('a tree', 'any')).toEqual({ kind: 'literal', value: 'a tree', suffix: '' });
		expect(service.valueOfTypedText('   ', 'any')).toBeUndefined();
	});
});

describe('StatementTextService literals', () => {
	it('labels the tag of a literal by its language, its datatype or Text', () => {
		expect(service.tagLabelOf({ kind: 'literal', value: 'Tree', suffix: '@en' })).toBe('en');
		expect(service.tagLabelOf({ kind: 'literal', value: '1', suffix: '^^xsd:integer' })).toBe('Integer');
		expect(service.tagLabelOf({ kind: 'literal', value: 'x', suffix: '^^ex:Code' })).toBe('Code');
		expect(service.tagLabelOf({ kind: 'literal', value: 'x', suffix: '' })).toBe('Text');
		expect(service.tagLabelOf({ kind: 'shorthandLiteral', text: '3.5' })).toBe('Decimal');
	});

	it('tells what keeps a text from fitting its datatype', () => {
		expect(service.literalProblemOf({ kind: 'literal', value: '1.5', suffix: '^^xsd:integer' })).toMatch(/Whole numbers/);
		expect(service.literalProblemOf({ kind: 'literal', value: '15', suffix: '^^xsd:integer' })).toBeUndefined();
		expect(service.literalProblemOf({ kind: 'literal', value: 'anything', suffix: '@en' })).toBeUndefined();
		expect(service.literalProblemOf({ kind: 'shorthandLiteral', text: '4x' })).toMatch(/number/);
		expect(service.datatypeIriOf('^^xsd:integer')).toBe(XSD.integer);
		expect(service.datatypeIriOf('^^')).toBe(XSD.string);
		expect(service.datatypeIriOf('@en')).toBeUndefined();
	});
});

describe('StatementTextService terms', () => {
	it('knows the range and IRI of a predicate as written', () => {
		expect(service.rangeOf('rdfs:label')).toBe('literal');
		expect(service.rangeOf('a')).toBe('resource');
		expect(service.rangeOf('ex:unknown')).toBe('any');
		expect(service.predicateIriOf('a')).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
		expect(service.predicateIriOf('foo:p')).toBeUndefined();
	});

	it('labels a predicate by the row, then the vocabulary, then its prefixed name, else by its text', () => {
		expect(service.predicateLabelOf('rdfs:label', { 'rdfs:label': { ...createIriView('rdfs:label'), label: 'name' } })).toBe('name');
		expect(service.predicateLabelOf('rdfs:label')).toBe('label');
		expect(service.predicateLabelOf('a')).toBe('type');
		expect(service.predicateLabelOf('<http://example.org/p>', { '<http://example.org/p>': createIriView('ex:p') })).toBe('ex:p');
		expect(service.predicateLabelOf('ex:unknown')).toBe('ex:unknown');
	});

	it('shows a resource as a pill by the vocabulary, the row or its IRI', () => {
		expect(service.pillDisplayOf('owl:Class')).toMatchObject({ label: 'Class', kind: 'vocabularyTerm' });
		expect(service.pillDisplayOf('ex:Other', { 'ex:Other': createIriView('ex:Other', 'Other') })).toMatchObject({ label: 'Other', kind: 'externalResource' });
		expect(service.pillDisplayOf('ex:New')).toMatchObject({ label: 'ex:New', kind: 'newResource' });
		expect(service.pillDisplayOf('foo:x').kind).toBe('error');
		expect(service.pillDisplayOf(`<${OWL.Thing}>`).label).toBe('Thing');
	});
});
