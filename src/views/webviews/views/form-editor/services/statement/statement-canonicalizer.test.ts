import { describe, expect, it } from 'vitest';
import { createTestStatementVocabulary } from '@src/utilities/mocks/statement-vocabulary-fixtures';
import { StatementCanonicalizer } from './statement-canonicalizer';
import { StatementLexer } from './statement-lexer';

const canonicalizer = new StatementCanonicalizer(createTestStatementVocabulary());
const lexer = new StatementLexer();

describe('StatementCanonicalizer.canonicalize', () => {
	it('joins the items by single spaces', () => {
		expect(canonicalizer.canonicalize('rdfs:label        "Tree"@en')).toBe('rdfs:label "Tree"@en');
		expect(canonicalizer.canonicalize('a                 owl:Class     owl:Thing')).toBe('a owl:Class owl:Thing');
	});

	it('moves a leading language tag behind the literal', () => {
		expect(canonicalizer.canonicalize('rdfs:label @en "x"')).toBe('rdfs:label "x"@en');
	});

	it('quotes bare words under a literal range or an unknown range', () => {
		expect(canonicalizer.canonicalize('rdfs:label Tree')).toBe('rdfs:label "Tree"');
		expect(canonicalizer.canonicalize('ex:custom Tree')).toBe('ex:custom "Tree"');
	});

	it('keeps prefixed names and bare words under a resource range', () => {
		expect(canonicalizer.canonicalize('ex:custom ex:Tree')).toBe('ex:custom ex:Tree');
		expect(canonicalizer.canonicalize('rdfs:subClassOf Tree')).toBe('rdfs:subClassOf Tree');
	});

	it('keeps numbers and booleans unquoted', () => {
		expect(canonicalizer.canonicalize('ex:custom 42 true 1.5')).toBe('ex:custom 42 true 1.5');
		expect(canonicalizer.canonicalize('rdfs:label 42')).toBe('rdfs:label 42');
	});

	it('drops dangling language tags', () => {
		expect(canonicalizer.canonicalize('rdfs:label @en')).toBe('rdfs:label');
		expect(canonicalizer.canonicalize('rdfs:label "x" @en')).toBe('rdfs:label "x"');
	});

	it('removes commas and semicolons', () => {
		expect(canonicalizer.canonicalize('a owl:Class, owl:Thing;')).toBe('a owl:Class owl:Thing');
	});

	it('re-serializes typed literals', () => {
		expect(canonicalizer.canonicalize('ex:p "1"^^xsd:int')).toBe('ex:p "1"^^xsd:int');
	});

	it('keeps lists and the markers for new nested nodes', () => {
		expect(canonicalizer.canonicalize('rdfs:range (ex:a "b")')).toBe('rdfs:range ( ex:a "b" )');
		expect(canonicalizer.canonicalize('ex:p ( )')).toBe('ex:p ( )');
		expect(canonicalizer.canonicalize('ex:p   []  ex:Tree')).toBe('ex:p [] ex:Tree');
	});

	it('trims comments and empties blank lines', () => {
		expect(canonicalizer.canonicalize('  # c ')).toBe('# c');
		expect(canonicalizer.canonicalize('')).toBe('');
		expect(canonicalizer.canonicalize('   ')).toBe('');
	});
});

describe('StatementCanonicalizer.canonicalValue', () => {
	it('writes literals with their tag or datatype', () => {
		expect(StatementCanonicalizer.canonicalValue(lexer.tokenize('"x"@en')[0], 'any')).toBe('"x"@en');
		expect(StatementCanonicalizer.canonicalValue(lexer.tokenize('"1"^^xsd:int')[0], 'any')).toBe('"1"^^xsd:int');
		expect(StatementCanonicalizer.canonicalValue(lexer.tokenize('@en')[0], 'any')).toBeUndefined();
	});
});

describe('StatementCanonicalizer.hasValues', () => {
	it('is true for lines with values and for comments', () => {
		expect(canonicalizer.hasValues('a owl:Class')).toBe(true);
		expect(canonicalizer.hasValues('# c')).toBe(true);
		expect(canonicalizer.hasValues('a')).toBe(false);
		expect(canonicalizer.hasValues('')).toBe(false);
	});
});

describe('nested-node markers', () => {
	it('counts the markers typed for new nested nodes', () => {
		expect(canonicalizer.countNestedNodeMarkers('ex:p [] ex:a [ ] [')).toBe(3);
		expect(canonicalizer.countNestedNodeMarkers('ex:p ex:a')).toBe(0);
	});

	it('removes the markers once the nodes are added', () => {
		expect(canonicalizer.removeNestedNodeMarkers('ex:p [] ex:a [')).toBe('ex:p ex:a');
		expect(canonicalizer.removeNestedNodeMarkers('ex:p []')).toBe('ex:p');
	});
});
