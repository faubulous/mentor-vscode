import { describe, expect, it } from 'vitest';
import { ValueFieldParser } from './value-field-parser';
import { ValueFieldSerializer } from './value-field-serializer';

const serializer = new ValueFieldSerializer(new ValueFieldParser());

describe('ValueFieldSerializer.serialize', () => {
	it('writes literals with their escapes and a valid suffix', () => {
		expect(serializer.serialize({ kind: 'literal', value: 'a "b"', suffix: '@en' })).toBe('"a \\"b\\""@en');
		expect(serializer.serialize({ kind: 'literal', value: 'x', suffix: '@' })).toBe('"x"');
		expect(serializer.serialize({ kind: 'literal', value: '1', suffix: '^^xsd:int' })).toBe('"1"^^xsd:int');
	});

	it('reads the source of a literal again when it has one', () => {
		expect(serializer.serialize({ kind: 'literal', value: 'old', suffix: '', source: '"new"@de' })).toBe('"new"@de');
		expect(serializer.serialize({ kind: 'literal', value: 'old', suffix: '', source: 'ex:Tree' })).toBe('ex:Tree');
		expect(serializer.serialize({ kind: 'literal', value: 'old', suffix: '', source: '  ' })).toBe('');
	});

	it('writes resources, numbers and source trimmed and a new nested node as an empty node', () => {
		expect(serializer.serialize({ kind: 'resource', text: ' ex:a ' })).toBe('ex:a');
		expect(serializer.serialize({ kind: 'shorthandLiteral', text: '42' })).toBe('42');
		expect(serializer.serialize({ kind: 'source', text: '( ex:a )' })).toBe('( ex:a )');
		expect(serializer.serialize({ kind: 'nestedNode' })).toBe('[]');
	});
});

describe('ValueFieldSerializer.validSuffix', () => {
	it('keeps language tags and datatypes only', () => {
		expect(ValueFieldSerializer.validSuffix('@en-GB')).toBe('@en-GB');
		expect(ValueFieldSerializer.validSuffix('^^xsd:int')).toBe('^^xsd:int');
		expect(ValueFieldSerializer.validSuffix('@')).toBe('');
		expect(ValueFieldSerializer.validSuffix('^^')).toBe('');
	});
});
