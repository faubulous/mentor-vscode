import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { FieldCompletionInput, FieldCompletionResolver } from './field-completion-resolver';
import { FieldId } from './field-id';
import { StatementFields } from './statement-fields';
import { ValueFieldParser } from './value-field-parser';

const BASE: FieldCompletionInput = {
	fields: new StatementFields('rdfs:label', [{ kind: 'literal', value: 'Tree', suffix: '@e' }, { kind: 'resource', text: 'ex:A' }]),
	pending: '',
	range: 'any',
	namespaces: LINE_TEST_NAMESPACES
};
const resolver = new FieldCompletionResolver(new ValueFieldParser());

/**
 * Resolve the scope with the given input overrides.
 */
function scope(input: Partial<FieldCompletionInput>) {
	return resolver.resolveScope({ ...BASE, ...input });
}

describe('FieldCompletionResolver.resolveScope', () => {
	it('offers nothing without a focused field', () => {
		expect(scope({})).toBeUndefined();
	});

	it('offers predicates in the predicate and prefixes for an undeclared one', () => {
		expect(scope({ focused: FieldId.PREDICATE })).toEqual({ kind: 'predicate', query: 'rdfs:label' });
		expect(scope({ focused: FieldId.PREDICATE, fields: new StatementFields('foaf:', []) })).toEqual({ kind: 'prefix', query: 'foaf' });
	});

	it('offers resources in the new value while it reads as a name, classes for a type', () => {
		expect(scope({ focused: FieldId.NEW_VALUE, pending: 'ex:T' })).toEqual({ kind: 'resource', query: 'ex:T' });
		expect(scope({ focused: FieldId.NEW_VALUE, pending: 'ex:T', predicateIri: RDF.type })).toEqual({ kind: 'class', query: 'ex:T' });
		expect(scope({ focused: FieldId.NEW_VALUE, pending: '"text' })).toBeUndefined();
		expect(scope({ focused: FieldId.NEW_VALUE, pending: '[' })).toBeUndefined();
		expect(scope({ focused: FieldId.NEW_VALUE, pending: 'ex:T', range: 'literal' })).toBeUndefined();
	});

	it('offers languages and datatypes in the tag field after a literal, and nothing in its text', () => {
		expect(scope({ focused: FieldId.tag(0) })).toEqual({ kind: 'language', query: 'e' });
		expect(scope({ focused: FieldId.tag(0), fields: new StatementFields('p', [{ kind: 'literal', value: '1', suffix: '^^xsd:in' }]) })).toEqual({ kind: 'datatype', query: 'xsd:in' });
		expect(scope({ focused: FieldId.tag(0), fields: new StatementFields('p', [{ kind: 'literal', value: '1', suffix: '' }]) })).toBeUndefined();
		expect(scope({ focused: FieldId.tag(1) })).toBeUndefined();
		expect(scope({ focused: FieldId.value(0) })).toBeUndefined();
	});

	it('offers resources in a pill only while it is edited', () => {
		expect(scope({ focused: FieldId.value(1) })).toBeUndefined();
		expect(scope({ focused: FieldId.value(1), editingPill: 1 })).toEqual({ kind: 'resource', query: 'ex:A' });
	});
});
