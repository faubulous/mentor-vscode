import { describe, expect, it } from 'vitest';
import { createTestLineVocabulary } from '@src/utilities/mocks/line-fixtures';
import { FieldId } from './field-id';
import { LineCanonicalizer } from './line-canonicalizer';
import { StatementFields } from './statement-fields';
import { ValueFieldParser } from './value-field-parser';
import { ValueFieldSerializer } from './value-field-serializer';

const parser = new ValueFieldParser();
const serializer = new ValueFieldSerializer(parser);
const canonicalizer = new LineCanonicalizer(createTestLineVocabulary());

/**
 * The fields the order tests share: a tagged literal and a resource.
 */
const FIELDS = new StatementFields('rdfs:label', [{ kind: 'literal', value: 'Tree', suffix: '@en' }, { kind: 'resource', text: 'ex:A' }]);

describe('StatementFields.fromLine', () => {
	it('splits a statement into its predicate and one field per value', () => {
		expect(StatementFields.fromLine('rdfs:label "Tree"@en "Baum"@de', parser)).toEqual(new StatementFields('rdfs:label', [
			{ kind: 'literal', value: 'Tree', suffix: '@en' },
			{ kind: 'literal', value: 'Baum', suffix: '@de' }
		]));
	});

	it('reads resources, numbers, nested-node markers and lists', () => {
		expect(StatementFields.fromLine('ex:p ex:Tree <http://x/y> 42 [] ( ex:a "b" )', parser).values).toEqual([
			{ kind: 'resource', text: 'ex:Tree' },
			{ kind: 'resource', text: '<http://x/y>' },
			{ kind: 'shorthandLiteral', text: '42' },
			{ kind: 'nestedNode' },
			{ kind: 'source', text: '( ex:a "b" )' }
		]);
	});

	it('unescapes literals and keeps datatypes', () => {
		expect(StatementFields.fromLine('ex:p "say \\"hi\\"\\nnow"^^xsd:string', parser).values).toEqual([{ kind: 'literal', value: 'say "hi"\nnow', suffix: '^^xsd:string' }]);
	});

	it('gives an empty line an empty predicate', () => {
		expect(StatementFields.fromLine('', parser)).toEqual(StatementFields.EMPTY);
	});
});

describe('StatementFields.toLineText', () => {
	it('joins the fields into the canonical text', () => {
		expect(new StatementFields('rdfs:label', [{ kind: 'literal', value: 'a "b"', suffix: '@en' }]).toLineText(serializer, canonicalizer)).toBe('rdfs:label "a \\"b\\""@en');
		expect(new StatementFields('a', [{ kind: 'resource', text: 'owl:Class' }, { kind: 'resource', text: ' ' }]).toLineText(serializer, canonicalizer)).toBe('a owl:Class');
	});

	it('is empty without a predicate', () => {
		expect(new StatementFields(' ', [{ kind: 'shorthandLiteral', text: '1' }]).toLineText(serializer, canonicalizer)).toBe('');
	});

	it('round-trips through the fields', () => {
		const text = 'ex:p ex:Tree "x"@en 42 [] ( ex:a "b" )';

		expect(StatementFields.fromLine(text, parser).toLineText(serializer, canonicalizer)).toBe(text);
	});
});

describe('StatementFields.fieldOrder', () => {
	it('walks the predicate, each value with the tag of a literal after it, then the new value', () => {
		expect(FIELDS.fieldOrder().map(String)).toEqual(['predicate', 'value:0', 'tag:0', 'value:1', 'newValue']);
	});
});

describe('StatementFields.neighbourField', () => {
	it('finds the field before and after, and nothing past the ends', () => {
		expect(FIELDS.neighbourField(FieldId.value(0), 'next')).toEqual(FieldId.tag(0));
		expect(FIELDS.neighbourField(FieldId.tag(0), 'next')).toEqual(FieldId.value(1));
		expect(FIELDS.neighbourField(FieldId.value(0), 'previous')).toBe(FieldId.PREDICATE);
		expect(FIELDS.neighbourField(FieldId.PREDICATE, 'previous')).toBeUndefined();
		expect(FIELDS.neighbourField(FieldId.NEW_VALUE, 'next')).toBeUndefined();
		expect(FIELDS.neighbourField(FieldId.tag(1), 'next')).toBeUndefined();
	});
});

describe('StatementFields changes', () => {
	it('replace, insert and remove values and replace the predicate without touching the original', () => {
		const changed = FIELDS.withValue(1, { kind: 'resource', text: 'ex:B' }).withValueInserted(0, { kind: 'nestedNode' }).withoutValue(1).withPredicate('a');

		expect(changed).toEqual(new StatementFields('a', [{ kind: 'nestedNode' }, { kind: 'resource', text: 'ex:B' }]));
		expect(FIELDS.values).toHaveLength(2);
	});
});
